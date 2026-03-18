import { SERIALIZE_FLAG } from "./McDataAnnotations";

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