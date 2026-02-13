import "reflect-metadata";

export const API_META_KEY = Symbol("mc:api");
export const METHOD_META_KEY = Symbol("mc:method");
export const REQUEST_KEY = Symbol("mc:requestBody");
export const RESPONSE_TYPE_KEY = Symbol("mc:responseType");
export const PATH_PARAMS_KEY = Symbol("mc:pathParams");
export const SUCCESS_HANDLER_KEY = Symbol("mc:successHandler");
export const ERROR_HANDLER_KEY = Symbol("mc:errorHandler");
export const FORMDATA_KEY = Symbol("mc:formdata");

const McAxiosAnnotations = {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	GET: (url: string, type: new (res: any) => any) => {
		return createDecorator("GET", url, type);
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	POST: (url: string, type: new (res: any) => any) => {
		return createDecorator("POST", url, type);
	},

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	PUT: (url: string, type: new (res: any) => any) => {
		return createDecorator("PUT", url, type);
	},

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	DELETE: (url: string, type: new (res: any) => any) => {
		return createDecorator("DELETE", url, type);
	},

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	MULTIPART: (url: string, type: new (res: any) => any) => {
		return createDecorator("MULTIPART", url, type);
	},

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	PATCH: (url: string, type: new (res: any) => any) => {
		return createDecorator("PATCH", url, type);
	},

	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	Request: (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
		Reflect.defineMetadata(REQUEST_KEY, parameterIndex, target, propertyKey);
	},

	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	FormData: (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
		Reflect.defineMetadata(FORMDATA_KEY, parameterIndex, target, propertyKey);
	},

	Path: (name: string) => {
		// biome-ignore lint/complexity/noBannedTypes: <explanation>
		return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
			const existingParams: { [key: string]: number } = Reflect.getMetadata(PATH_PARAMS_KEY, target, propertyKey) || {};

			existingParams[name] = parameterIndex;

			Reflect.defineMetadata(PATH_PARAMS_KEY, existingParams, target, propertyKey);
		};
	},

	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	Success: (fn: Function) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			Reflect.defineMetadata(SUCCESS_HANDLER_KEY, fn, target, propertyKey);
		};
	},

	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
	Error: (fn: Function) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			Reflect.defineMetadata(ERROR_HANDLER_KEY, fn, target, propertyKey);
		};
	},
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const createDecorator = (method: string, path: string, type: new (res: any) => any) => {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	return (target: any, propertyKey: string) => {
		Reflect.defineMetadata(METHOD_META_KEY, { method, path }, target, propertyKey);
		Reflect.defineMetadata(RESPONSE_TYPE_KEY, type, target, propertyKey);
	};
};

export default McAxiosAnnotations;
