import "reflect-metadata";
import McResponse from "./McResponse";

export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const FIELD_TYPE = Symbol("mc:fieldType");
export const FIELD_IS_ARRAY = Symbol("mc:isArray");
export const FIELD_IS_MAP = Symbol("mc:isMap");
export const FIELD_MAP_KEY = Symbol("mc:mapKey");
export const FIELD_PATH = Symbol("mc:fieldPath");
export const FIELD_DEFAULT = Symbol("mc:fieldDefault");
export const FIELD_KEYS = Symbol("mc:fieldKeys");
export const FIELD_CUSTOM_FN = Symbol("mc:customFn");

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export type McFieldMapper = (self: any, data: any) => any;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const isEntity = (type: any): boolean => {
	return !!Reflect.getMetadata(ENTITY_FLAG, type);
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const findPath = (obj: object, path: string): any => {
	const keys: string[] = path.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	let result: any = obj;
	for (const key of keys) {
		result = result[key];
	}
	return result;
};

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
const validateArrayType = (type: any, decorator: string): void => {
	if (type === Array) {
		console.warn(`[@${decorator}] 잘못된 타입입니다. 'WalletInfo[]' 또는 'Array<WalletInfo>' 형태는 런타임에서 타입 정보가 소멸됩니다. '[WalletInfo]' 형태로 사용해 주세요.`);
	}
};

const McDataAnnotations = {

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	// biome-ignore lint/suspicious/noShadowRestrictedNames: <explanation>
	// biome-ignore lint/complexity/noBannedTypes: <explanation>
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	Entity: (entityPath?: string | (new (...args: any[]) => {})) => {
		const applyDecorator = (path: string | undefined) => {
			return <T extends { new(...args: any[]): {} }>(constructor: T): T => {
				Reflect.defineMetadata(ENTITY_FLAG, true, constructor);
				return class extends constructor {
					// biome-ignore lint/suspicious/noExplicitAny: <explanation>
					constructor(...args: any[]) {
						super(...args);
						let body = args[0];
						if (this instanceof McResponse) {
							body = path ? findPath(args[0]?.data, path): args[0]?.data;
						}

						if (body === undefined) return;
						console.log(`Dark Response > ${body.toString()}`);
						const proto = Object.getPrototypeOf(this);
						const names: string[] = Reflect.getMetadata(FIELD_KEYS, proto) || [];
						for (const key of names) {
							if (typeof key !== "string") continue;

							// CustomField 처리
							const customFn: McFieldMapper | undefined = Reflect.getMetadata(FIELD_CUSTOM_FN, proto, key);
							if (customFn) {
								const fieldPath = Reflect.getMetadata(FIELD_PATH, proto, key);
								const rawValue = fieldPath ? findPath(body, fieldPath) : body[key];
								// biome-ignore lint/suspicious/noExplicitAny: <explanation>
								(this as any)[key] = customFn(this, rawValue);
								continue;
							}

							const type = Reflect.getMetadata(FIELD_TYPE, proto, key);
							const isArray = Reflect.getMetadata(FIELD_IS_ARRAY, proto, key);
							const isMap = Reflect.getMetadata(FIELD_IS_MAP, proto, key);
							const mapKeyType = Reflect.getMetadata(FIELD_MAP_KEY, proto, key) ?? String;
							const fieldPath = Reflect.getMetadata(FIELD_PATH, proto, key);
							const defaultValue = Reflect.getMetadata(FIELD_DEFAULT, proto, key);
							if (!type) continue;

							const rawValue = fieldPath ? findPath(body, fieldPath) : body[key];
							if (rawValue !== undefined && rawValue !== null) {
								if (isMap && typeof rawValue === 'object') {
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									const map = new Map<any, any>();
									for (const [k, v] of Object.entries(rawValue)) {
										if (isArray && Array.isArray(v)) {
											// Map<string, WalletInfo[]>
											// biome-ignore lint/suspicious/noExplicitAny: <explanation>
											map.set(mapKeyType(k), (v as any[]).map((item: any) => isEntity(type) ? new type(item) : type(item)));
										} else {
											// Map<string, WalletInfo>
											map.set(mapKeyType(k), isEntity(type) ? new type(v) : type(v));
										}
									}
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									(this as any)[key] = map;
								} else if (isArray && Array.isArray(rawValue)) {
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									(this as any)[key] = rawValue.map((item: any) => {
										return isEntity(type) ? new type(item) : type(item);
									});
								} else if ([String, Number, Boolean].includes(type)) {
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									(this as any)[key] = type(rawValue);
								} else if (isEntity(type)) {
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									(this as any)[key] = new type(rawValue);
								} else {
									// biome-ignore lint/suspicious/noExplicitAny: <explanation>
									(this as any)[key] = new type(rawValue);
								}
							} else {
								// biome-ignore lint/suspicious/noExplicitAny: <explanation>
								(this as any)[key] = defaultValue;
							}
						}
					}
				};
			}
		};

		if (typeof entityPath === 'function') {
			return applyDecorator(undefined)(entityPath as any) as any;
		}

		return applyDecorator(entityPath);
	},
	Serialize: (jsonKey: string) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const properties: any[] = Reflect.getMetadata(SERIALIZE_FLAG, target) || [];
			properties.push({
				propertyKey: propertyKey,
				jsonKey: jsonKey,
			});
			Reflect.defineMetadata(SERIALIZE_FLAG, properties, target);
		};
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	Field: (type: any, path?: string, defaultValue: any = undefined) => {
		validateArrayType(type, 'Field');
		const isValueArray = Array.isArray(type);
		const actualType = isValueArray ? type[0] : type;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
			keys.push(propertyKey);
			Reflect.defineMetadata(FIELD_KEYS, keys, target);
			Reflect.defineMetadata(FIELD_TYPE, actualType, target, propertyKey);
			Reflect.defineMetadata(FIELD_IS_ARRAY, isValueArray, target, propertyKey);
			Reflect.defineMetadata(FIELD_DEFAULT, defaultValue, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		};
	},
	/**
	 * @deprecated Use @Field([Type]) instead.
	 */
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ArrayField: (type: any, path?: string) => {
		console.warn(`[@ArrayField] deprecated: @Field([${type?.name ?? 'Type'}], '${path ?? ''}') 으로 변경해 주세요.`);
		return McDataAnnotations.Field([type], path);
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	CustomField: (fn: McFieldMapper, path?: string) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
			keys.push(propertyKey);
			Reflect.defineMetadata(FIELD_KEYS, keys, target);
			Reflect.defineMetadata(FIELD_CUSTOM_FN, fn, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		};
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	MapField: (type: any, path?: string, keyType: any = String) => {
		validateArrayType(type, 'MapField');
		const isValueArray = Array.isArray(type);
		const actualType = isValueArray ? type[0] : type;
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
			keys.push(propertyKey);
			Reflect.defineMetadata(FIELD_KEYS, keys, target);
			Reflect.defineMetadata(FIELD_TYPE, actualType, target, propertyKey);
			Reflect.defineMetadata(FIELD_IS_ARRAY, isValueArray, target, propertyKey);
			Reflect.defineMetadata(FIELD_IS_MAP, true, target, propertyKey);
			Reflect.defineMetadata(FIELD_MAP_KEY, keyType, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		};
	},
};

export default McDataAnnotations;
