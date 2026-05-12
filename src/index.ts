import McAxiosOrigin from "./McAxios";
import McAxiosDecorators from "./McAxiosDecorators";
import McAxiosManager from "./McAxiosManager";
import McRequest from "./McRequest";
import McResponse from "./McResponse";

const McAxios = Object.assign(
	McAxiosOrigin,
	McAxiosDecorators,
	{
		Manager: McAxiosManager,
		Request: McRequest,
		Response: McResponse,
	},
);

export default McAxios;
export { McAxios, McAxiosDecorators, McAxiosManager, McRequest, McResponse };
