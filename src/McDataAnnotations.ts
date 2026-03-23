import "reflect-metadata";
import McResponse from "./McResponse";

export const ENTITY_FLAG = Symbol("mc:isEntity");
export const SERIALIZE_FLAG = Symbol("mc:serialize");
export const FIELD_TYPE = Symbol("mc:fieldType");
export const FIELD_IS_ARRAY = Symbol("mc:isArray");
export const FIELD_PATH = Symbol("mc:fieldPath");
export const FIELD_DEFAULT = Symbol("mc:fieldDefault");
export const FIELD_KEYS = Symbol("mc:fieldKeys");

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
						// const response = args[0];
						let body = args[0];
						if (this instanceof McResponse) {
							// if (entityPath === undefined) body = args[0]?.data;
							body = path ? findPath(args[0]?.data, path): args[0]?.data;
						}

						if (body === undefined) return;
						console.log(`Dark Response > ${body.toString()}`);
						const proto = Object.getPrototypeOf(this);
						// 💡 @Field / @ArrayField 데코레이터가 누적한 키 목록 사용
						const names: string[] = Reflect.getMetadata(FIELD_KEYS, proto) || [];
						for (const key of names) {
							if (typeof key !== "string") continue;

							const type = Reflect.getMetadata(FIELD_TYPE, proto, key);
							const isArray = Reflect.getMetadata(FIELD_IS_ARRAY, proto, key);
							const fieldPath = Reflect.getMetadata(FIELD_PATH, proto, key);
							const defaultValue = Reflect.getMetadata(FIELD_DEFAULT, proto, key);
							if (!type) continue;

							const rawValue = fieldPath ? findPath(body, fieldPath) : body[key];
							if (rawValue !== undefined && rawValue !== null) {
								if (isArray && Array.isArray(rawValue)) {
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
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
			keys.push(propertyKey);
			Reflect.defineMetadata(FIELD_KEYS, keys, target);
			// const type = Reflect.getMetadata("design:type", target, propertyKey);
			Reflect.defineMetadata(FIELD_TYPE, type, target, propertyKey);
			Reflect.defineMetadata(FIELD_DEFAULT, defaultValue, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		};
	},
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	ArrayField: (type: any, path?: string, defaultValue: any = undefined) => {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		return (target: any, propertyKey: string) => {
			const keys: string[] = Reflect.getMetadata(FIELD_KEYS, target) || [];
			keys.push(propertyKey);
			Reflect.defineMetadata(FIELD_KEYS, keys, target);
			// const type = Reflect.getMetadata("design:type", target, propertyKey);
			Reflect.defineMetadata(FIELD_TYPE, type, target, propertyKey);
			Reflect.defineMetadata(FIELD_IS_ARRAY, true, target, propertyKey);
			Reflect.defineMetadata(FIELD_PATH, path, target, propertyKey);
		};
	},
	// Name: (originalKey: string) => {
	// 	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	// 	return (target: any, propertyKey: string) => {
	// 		// const type = Reflect.getMetadata("design:type", target, propertyKey);
	// 		Reflect.defineMetadata(FIELD_NAME, originalKey, target, propertyKey);
	// 	};
	// },
};

export default McDataAnnotations;
