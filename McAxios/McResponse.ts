import type { AxiosResponseHeaders, RawAxiosResponseHeaders } from "axios";
import type { AxiosResponse } from "axios";

export default abstract class McResponse {
	private readonly _headers: RawAxiosResponseHeaders | AxiosResponseHeaders;
	protected constructor(response: AxiosResponse) {
		this._headers = response.headers;
	}

	get headers(): RawAxiosResponseHeaders | AxiosResponseHeaders {
		return this._headers;
	}

	// public static fromJson<T extends McResponse>(json: object): T {
	// 	return new T();
	// }
	// public abstract setParam(data: param);
}
