import type McAxios from "./McAxios";

export const createMcAxios = <T extends McAxios>(api: T): T => {
	McAxiosManager.add(api);
	return api;
};
export default class McAxiosManager {
	private static _axios: McAxios[] = [];

	private constructor() {}

	public static set(servers: McAxios[]) {
		McAxiosManager.clear();
		for (const axios of servers) McAxiosManager.add(axios);
	}

	public static add(axios: McAxios) {
		McAxiosManager._axios.push(axios);
	}

	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	public static get<T extends McAxios>(type: abstract new (...args: any[]) => T): T {
		const result = McAxiosManager._axios.find((axios) => axios instanceof type);
		if (result) return result as T;
		throw new Error(`Axios is undefined : ${type.name}`);
	}

	// public static delete(type: object) {
	// 	return McAxiosManager._axios.splice(type);
	// }

	public static clear() {
		McAxiosManager._axios = [];
	}
}
