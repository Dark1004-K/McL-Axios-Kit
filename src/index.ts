// 1. 모든 클래스를 가져옵니다.
// (각 파일들이 export default로 되어 있다고 가정합니다.)
import McAxiosOrigin from './McAxios';
import McAxiosManager from './McAxiosManager';
import McAxiosAnnotations from './McAxiosAnnotations';
import McDataAnnotations from './McDataAnnotations';
import McRequest from './McRequest';
import McResponse from './McResponse';

/**
 * 2. McAxios 클래스에 다른 클래스들을 정적(static) 속성으로 결합합니다.
 * 이렇게 하면 McAxios.Manager와 같은 방식으로 접근이 가능해집니다.
 */
const McAxios = Object.assign(McAxiosOrigin, {
    Manager: McAxiosManager,
    AxiosAnnotations: McAxiosAnnotations,
    DataAnnotations: McDataAnnotations,
    Request: McRequest,
    Response: McResponse,
});

// 3. 통합된 McAxios를 default로 내보냅니다.
export default McAxios;

// 4. 필요한 경우 { McAxiosManager } 처럼 별도로 쓰고 싶을 때를 대비한 Named Export
export {
    McAxios,
    McAxiosManager,
    McAxiosAnnotations,
    McDataAnnotations,
    McRequest,
    McResponse
};