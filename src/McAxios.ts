import axios, { AxiosHeaders, type AxiosInstance } from "axios";
import { ERROR_HANDLER_KEY, FORMDATA_KEY, HANDLER_SYMBOL_MAP_KEY, HEADER_KEY, METHOD_META_KEY, PATH_PARAMS_KEY, REQUEST_KEY, RESPONSE_TYPE_KEY, SUCCESS_HANDLER_KEY } from "./McAxiosDecorators";
import McRequest from "./McRequest";
import { isFunction, isSymbol } from "./McTypeUtils";

export default abstract class McAxios {
	private _axios: AxiosInstance;

	public constructor() {
		this._axios = axios.create();
		this.bindEndpoints();
	}

	protected stub(): never {
		const stack = new Error().stack?.split("\n");
		const callerLine = stack?.[2] ?? "";
		const methodName = callerLine.match(/at (?:\w+\.)?(\w+)\s/)?.[1] ?? "unknown";
		throw new Error(`[McAxios] '${methodName}' is not bound. Make sure your class properly extends McAxios.`);
	}

	protected abstract header(): AxiosHeaders | undefined;

	private readEndpointMeta(proto: object, name: string) {
		const meta = Reflect.getMetadata(METHOD_META_KEY, proto, name);
		if (!meta) return null;
		return {
			method: meta.method as string,
			path: meta.path as string,
			successHandler: Reflect.getMetadata(SUCCESS_HANDLER_KEY, proto, name) as Function | symbol | undefined,
			errorHandler: Reflect.getMetadata(ERROR_HANDLER_KEY, proto, name) as Function | symbol | undefined,
			requestBody: Reflect.getMetadata(REQUEST_KEY, proto, name) as number | undefined,
			responseType: Reflect.getMetadata(RESPONSE_TYPE_KEY, proto, name),
			formData: Reflect.getMetadata(FORMDATA_KEY, proto, name) as number | undefined,
			pathParams: (Reflect.getMetadata(PATH_PARAMS_KEY, proto, name) || {}) as { [key: string]: number },
			headerParam: (Reflect.getMetadata(HEADER_KEY, proto, name) || {}) as { [key: string]: number },
			symbolMap: (Reflect.getMetadata(HANDLER_SYMBOL_MAP_KEY, proto) || new Map()) as Map<symbol, string>,
		};
	}

	private resolveHandler(handler: Function | symbol | undefined, symbolMap: Map<symbol, string>): ((...args: any[]) => Promise<any>) | undefined {
		if (isSymbol(handler)) {
			const methodName = symbolMap.get(handler);
			if (methodName) return (...args: any[]) => (this as any)[methodName](...args);
			return undefined;
		}
		if (isFunction(handler)) return (...args: any[]) => (handler as Function).call(this, ...args);
		return undefined;
	}

	private buildMultipartEndpoint(
		url: string,
		formDataIdx: number | undefined,
		responseType: any,
		resolvedSuccess: ((...args: any[]) => Promise<any>) | undefined,
		resolvedError: ((...args: any[]) => Promise<any>) | undefined,
	): (...args: any[]) => Promise<any> {
		return async (...args: any[]) => {
			const data = formDataIdx !== undefined ? args[formDataIdx] : undefined;
			const apiFunc = async () => this._axios.request({ method: "POST", url, data, headers: { "Content-Type": "multipart/form-data" } });
			try {
				const response = await apiFunc();
				if (resolvedSuccess) return new responseType(await resolvedSuccess(response, apiFunc));
				if (responseType) return new responseType(response);
				return response.data;
			} catch (reqErr) {
				if (resolvedError) {
					const result = await resolvedError(reqErr, apiFunc);
					if (result !== undefined) return result;
				}
				throw reqErr;
			}
		};
	}

	private buildRequestEndpoint(
		method: string,
		path: string,
		pathParams: { [key: string]: number },
		headerParam: { [key: string]: number },
		requestBodyIdx: number | undefined,
		responseType: any,
		resolvedSuccess: ((...args: any[]) => Promise<any>) | undefined,
		resolvedError: ((...args: any[]) => Promise<any>) | undefined,
		name: string,
	): (...args: any[]) => Promise<any> {
		return async (...args: any[]) => {
			let url = path;
			for (const [key, index] of Object.entries(pathParams)) {
				url = url.replace(`{${key}}`, encodeURIComponent(args[index]));
			}

			const request = requestBodyIdx !== undefined ? args[requestBodyIdx] : undefined;
			if (request !== undefined && request instanceof McRequest === false) {
				const err = new Error("Invalid request format.");
				if (resolvedError) await resolvedError(err);
				throw err;
			}
			const data = request !== undefined ? request.toJson() : undefined;
			console.log(`param -> ${name} :: ${data}`);

			const apiFunc = async () => {
				const headers: AxiosHeaders = this.header() ?? new AxiosHeaders();
				for (const [key, index] of Object.entries(headerParam)) {
					headers.set(key, encodeURIComponent(args[index]));
				}
				return this._axios.request({ method, url, data, headers });
			};

			try {
				const response = await apiFunc();
				if (resolvedSuccess) return new responseType(await resolvedSuccess(response, apiFunc));
				if (responseType) return new responseType(response);
				return response.data;
			} catch (reqErr) {
				if (resolvedError) {
					const result = await resolvedError(reqErr, apiFunc);
					if (result !== undefined) return result;
				}
				throw reqErr;
			}
		};
	}

	private bindEndpoints() {
		const proto = Object.getPrototypeOf(this);
		for (const name of Object.getOwnPropertyNames(proto)) {
			const descriptor = Object.getOwnPropertyDescriptor(proto, name);
			if (!descriptor || !isFunction(descriptor.value)) continue;

			const meta = this.readEndpointMeta(proto, name);
			if (!meta) continue;

			const { method, path, successHandler, errorHandler, requestBody, responseType, formData, pathParams, headerParam, symbolMap } = meta;
			const resolvedSuccess = this.resolveHandler(successHandler, symbolMap);
			const resolvedError = this.resolveHandler(errorHandler, symbolMap);

			const endpointFn =
				method === "MULTIPART"
					? this.buildMultipartEndpoint(path, formData, responseType, resolvedSuccess, resolvedError)
					: this.buildRequestEndpoint(method, path, pathParams, headerParam, requestBody, responseType, resolvedSuccess, resolvedError, name);

			Object.defineProperty(this, name, { value: endpointFn });
		}
	}
}
