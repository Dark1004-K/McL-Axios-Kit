import "reflect-metadata";
import { isObject, isString } from "./McTypeUtils";

export const API_META_KEY = Symbol("mc:api");
export const METHOD_META_KEY = Symbol("mc:method");
export const REQUEST_KEY = Symbol("mc:requestBody");
export const RESPONSE_TYPE_KEY = Symbol("mc:responseType");
export const PATH_PARAMS_KEY = Symbol("mc:pathParams");
export const SUCCESS_HANDLER_KEY = Symbol("mc:successHandler");
export const ERROR_HANDLER_KEY = Symbol("mc:errorHandler");
export const HANDLER_SYMBOL_MAP_KEY = Symbol("mc:handlerSymbolMap");
export const FORMDATA_KEY = Symbol("mc:formdata");
export const HEADER_KEY = Symbol("mc:header");

const createKeyedParamDecorator = (metaKey: symbol) => {
	const apply = (key: string | undefined, target: Object, propKey: string | symbol, paramIdx: number) => {
		const existing: { [k: string]: number } = Reflect.getMetadata(metaKey, target, propKey) || {};
		let resolvedKey: string;
		if (key) {
			resolvedKey = key;
		} else {
			const fn = (target as any)[propKey as string];
			const match = fn?.toString().match(/\(([^)]*)\)/);
			const params = match?.[1].split(",").map((p: string) => p.trim().split(/[\s:=]/)[0]) ?? [];
			resolvedKey = params[paramIdx] ?? `param${paramIdx}`;
		}
		existing[resolvedKey] = paramIdx;
		Reflect.defineMetadata(metaKey, existing, target, propKey);
	};

	return (targetOrKey?: Object | string, propertyKey?: string | symbol, parameterIndex?: number): any => {
		if (isObject(targetOrKey) && propertyKey !== undefined && parameterIndex !== undefined) {
			apply(undefined, targetOrKey, propertyKey, parameterIndex);
		} else {
			const key = isString(targetOrKey) ? targetOrKey : undefined;
			return (target: Object, propKey: string | symbol, paramIdx: number) => apply(key, target, propKey, paramIdx);
		}
	};
};

// HTTP 메서드 데코레이터 팩토리
const createDecorator = (method: string, path: string, type: new (res: any) => any) => {
	return (target: any, propertyKey: string) => {
		Reflect.defineMetadata(METHOD_META_KEY, { method, path }, target, propertyKey);
		Reflect.defineMetadata(RESPONSE_TYPE_KEY, type, target, propertyKey);
	};
};

// 파라미터 인덱스를 단순 저장하는 파라미터 데코레이터 팩토리
const createIndexParamDecorator = (metaKey: symbol) => {
	return (target: Object, propertyKey: string | symbol, parameterIndex: number) => {
		Reflect.defineMetadata(metaKey, parameterIndex, target, propertyKey);
	};
};

// fn | symbol을 메서드에 저장하는 메서드 데코레이터 팩토리
const createHandlerDecorator = (metaKey: symbol) => {
	return (fn: Function | symbol) => (target: any, propertyKey: string) => {
		Reflect.defineMetadata(metaKey, fn, target, propertyKey);
	};
};

// Map<symbol, methodName>을 누적 저장하는 메서드 데코레이터 팩토리
const createSymbolMapDecorator = (mapKey: symbol) => {
	return (sym: symbol) => (target: any, propertyKey: string) => {
		const map: Map<symbol, string> = Reflect.getMetadata(mapKey, target) || new Map();
		map.set(sym, propertyKey);
		Reflect.defineMetadata(mapKey, map, target);
	};
};

const McAxiosAnnotations = {
	GET: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("GET", url, type),
	POST: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("POST", url, type),
	PUT: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("PUT", url, type),
	DELETE: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("DELETE", url, type),
	MULTIPART: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("MULTIPART", url, type),
	PATCH: (url: string, type: new (res: any) => any): ((target: any, propertyKey: string) => void) => createDecorator("PATCH", url, type),
	Request: (target: Object, propertyKey: string | symbol, parameterIndex: number): void => createIndexParamDecorator(REQUEST_KEY)(target, propertyKey, parameterIndex),
	FormData: (target: Object, propertyKey: string | symbol, parameterIndex: number): void => createIndexParamDecorator(FORMDATA_KEY)(target, propertyKey, parameterIndex),
	Header: createKeyedParamDecorator(HEADER_KEY) as (targetOrKey?: Object | string, propertyKey?: string | symbol, parameterIndex?: number) => ParameterDecorator | undefined,
	Path: createKeyedParamDecorator(PATH_PARAMS_KEY) as (targetOrKey?: Object | string, propertyKey?: string | symbol, parameterIndex?: number) => ParameterDecorator | undefined,
	Success: (fn: Function | symbol): ((target: any, propertyKey: string) => void) => createHandlerDecorator(SUCCESS_HANDLER_KEY)(fn),
	Error: (fn: Function | symbol): ((target: any, propertyKey: string) => void) => createHandlerDecorator(ERROR_HANDLER_KEY)(fn),
	SuccessHandler: (sym: symbol): ((target: any, propertyKey: string) => void) => createSymbolMapDecorator(HANDLER_SYMBOL_MAP_KEY)(sym),
	ErrorHandler: (sym: symbol): ((target: any, propertyKey: string) => void) => createSymbolMapDecorator(HANDLER_SYMBOL_MAP_KEY)(sym),
};

export default McAxiosAnnotations;
