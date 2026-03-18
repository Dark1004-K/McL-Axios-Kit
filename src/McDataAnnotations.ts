import "reflect-metadata";
import McResponse from "./McResponse";

const ENTITY_FLAG = Symbol("mc:isEntity");
const SERIALIZE_FLAG = Symbol("mc:serialize");
const FIELD_TYPE = Symbol("mc:fieldType");
const FIELD_IS_ARRAY = Symbol("mc:isArray");
const FIELD_PATH = Symbol("mc:fieldPath");
const FIELD_DEFAULT = Symbol("mc:fieldDefault");

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
	Entity: <T extends { new (...args: any[]): {} }>(constructor: T): T => {
		Reflect.defineMetadata(ENTITY_FLAG, true, constructor);
		return class extends constructor {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			constructor(...args: any[]) {
				super(...args);

				// const response = args[0];
				let body = args[0];
				if (this instanceof McResponse) {
					body = args[0]?.data?.body;
				}

				if (body === undefined) return;
				console.log(`Dark Response > ${body.toString()}`);
				const proto = Object.getPrototypeOf(this);
				// 💡 메타데이터가 붙은 키들만 필터링
				const names = Object.getOwnPropertyNames(this).filter((key) => Reflect.hasMetadata(FIELD_TYPE, proto, key));
				for (const key of names) {
					if (typeof key !== "string") continue;
					const descriptor = Object.getOwnPropertyDescriptor(proto, key);

					const type = Reflect.getMetadata(FIELD_TYPE, proto, key);
					const isArray = Reflect.getMetadata(FIELD_IS_ARRAY, proto, key);
					const path = Reflect.getMetadata(FIELD_PATH, proto, key);
					const defaultValue = Reflect.getMetadata(FIELD_DEFAULT, proto, key) || {};
					if (!type) continue;

					const rawValue = path ? findPath(body, path) : body[key];
					// console.log(`Dartk > ${key.toString()} >> ${isArray} >>> ${Array.isArray(rawValue)}`);
					if (rawValue !== undefined && rawValue !== null) {
						if (isArray && Array.isArray(rawValue)) {
							let cnt = 0;
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
						if (isArray && Array.isArray(rawValue)) {
							let cnt = 0;
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
							(this as any)[key] = rawValue.map((item: any) => {
								return new type(defaultValue);
							});
						} else {
							// biome-ignore lint/suspicious/noExplicitAny: <explanation>
							(this as any)[key] = defaultValue; // 또는 null, 또는 디폴트 값
						}
					}
				}
				// currentPrototype = Object.getPrototypeOf(currentPrototype);
				// }
			}
		};
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

export abstract class McSerializable {
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public toJson(): Record<string, any> {
		// biome-ignore lint/suspicious/noExplicitAny: <explanation>
		const result: Record<string, any> = {};

		// 'this'는 런타임에 클래스의 인스턴스를 가리킵니다.
		// 메타데이터는 프로토타입에 저장되어 있으므로 this.constructor.prototype 에서 찾습니다.
		const properties = Reflect.getMetadata(SERIALIZE_FLAG, this.constructor.prototype);

		if (!properties) {
			return result;
		}

		for (const prop of properties) {
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const value = (this as any)[prop.propertyKey];
			// (this as any)를 통해 인스턴스의 프로퍼티 값에 접근합니다.
			if (Array.isArray(value)) {
				// 값이 배열일 경우, 각 항목을 재귀적으로 처리
				result[prop.jsonKey] = value.map((item) => {
					if (item && typeof item.toJson === "function") {
						return item.toJson(); // 배열 안의 객체가 serializable이면 toJson() 호출
					}
					return item; // 아니면 값 그대로 반환
				});
			} else if (value && typeof value.toJson === "function") {
				// 값이 단일 serializable 객체일 경우
				result[prop.jsonKey] = value.toJson(); // 해당 객체의 toJson() 호출
			} else {
				// 값이 기본 타입이거나 non-serializable 객체일 경우
				result[prop.jsonKey] = value;
			}
		}

		return result;
	}
}

export default {McDataAnnotations, McSerializable};
