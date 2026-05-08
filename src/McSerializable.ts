import { SERIALIZE_FLAG } from "./McDataAnnotations";
import { isFunction } from "./McTypeUtils";

const serialize = (value: any): any => {
	if (isFunction(value?.toJson)) return value.toJson();
	return value;
};

export default abstract class McSerializable {
	public toString(): string {
		return JSON.stringify(this.toJson());
	}

	public toJson(): Record<string, any> {
		const result: Record<string, any> = {};
		const properties = Reflect.getMetadata(SERIALIZE_FLAG, this.constructor.prototype);
		if (!properties) return result;
		for (const prop of properties) {
			const value = (this as any)[prop.propertyKey];
			result[prop.jsonKey] = Array.isArray(value) ? value.map(serialize) : serialize(value);
		}
		return result;
	}
}
