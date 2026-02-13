import axios, { type AxiosHeaders, type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from "axios";
import McRequest from "./McRequest";
import McAxiosAnnotations, { ERROR_HANDLER_KEY, METHOD_META_KEY, PATH_PARAMS_KEY, REQUEST_KEY, RESPONSE_TYPE_KEY, SUCCESS_HANDLER_KEY, FORMDATA_KEY } from "./McAxiosAnnotations";

export default abstract class McAxios {
	private _axios: AxiosInstance;

	public constructor() {
		this._axios = axios.create();
		this.bindEndpoints();
	}
	protected abstract header(): AxiosHeaders | undefined;
	private bindEndpoints() {
		const proto = Object.getPrototypeOf(this);
		const names = Object.getOwnPropertyNames(proto);
		// const names = Object.keys(this);
		for (const name of names) {
			const descriptor = Object.getOwnPropertyDescriptor(proto, name);
			if (!descriptor || typeof descriptor.value !== "function") continue;

			const meta = Reflect.getMetadata(METHOD_META_KEY, proto, name);
			if (!meta) continue;

			const { method, path } = meta;
			const successHandler = Reflect.getMetadata(SUCCESS_HANDLER_KEY, proto, name);
			const errorHandler = Reflect.getMetadata(ERROR_HANDLER_KEY, proto, name);
			const requestBody = Reflect.getMetadata(REQUEST_KEY, proto, name);
			const responseType = Reflect.getMetadata(RESPONSE_TYPE_KEY, proto, name);
			const formData = Reflect.getMetadata(FORMDATA_KEY, proto, name);

			const pathParams: { [key: string]: number } = Reflect.getMetadata(PATH_PARAMS_KEY, proto, name) || {};

			Object.defineProperty(this, name, {
				// biome-ignore lint/suspicious/noExplicitAny: <explanation>
				value: async (...args: any[]) => {
					let url = path;

					// Path param 치환
					for (const [key, index] of Object.entries(pathParams)) {
						const value = encodeURIComponent(args[index]);
						url = url.replace(`{${key}}`, value);
					}

					if (method === "MULTIPART") {
						const data = formData !== undefined ? args[formData] : undefined;
						try {
							const response = await this._axios
								.request({
									method: "POST",
									url,
									data,
									headers: { "Content-Type": "multipart/form-data" },
								})
								.catch((err) => {
									throw err;
								});
							if (successHandler) return successHandler(response);
							if (responseType) return new responseType(response);
							return response.data;
						} catch (reqErr) {
							const err = errorHandler ? errorHandler(reqErr) : reqErr;
							throw reqErr;
						}
					}

					const request = requestBody !== undefined ? args[requestBody] : undefined;

					if (request !== undefined && request instanceof McRequest === false) {
						const err = new Error("Request 형식이 잘못 되었습니다.");
						errorHandler ? errorHandler(err) : err;
						throw err;
					}
					const data = request !== undefined ? request.toJson() : undefined;
					console.log(`param -> ${name} :: ${data}`);

					try {
						const response = await this._axios
							.request({
								method,
								url,
								data,
							})
							.catch((err) => {
								throw err;
							});
						if (successHandler) return successHandler(response);
						if (responseType) return new responseType(response);
						return response.data;
					} catch (reqErr) {
						const err = errorHandler ? errorHandler(reqErr) : reqErr;
						throw reqErr;
					}
				},
			});
		}
	}
}
