# @moca-labs/axios-kit-ts

Axios 기반 TypeScript API 클라이언트 라이브러리입니다.  
데코레이터로 HTTP 메서드, 파라미터, 응답 핸들러를 선언적으로 정의합니다.

## 설치

```bash
npm install @moca-labs/axios-kit-ts axios
```

tsconfig.json에 다음 옵션이 필요합니다.

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

---

## Import

```ts
import McAxios from "@moca-labs/axios-kit-ts";
import { McEntity } from "@moca-labs/axios-kit-ts";
```

---

## 특징

### `extends McAxios` — API 클라이언트 베이스 클래스

모든 API 클라이언트는 `McAxios`를 상속받아 구현합니다.  
`header()` 메서드를 통해 공통 헤더를 반환할 수 있습니다.

```ts
class UserApi extends McAxios {
  protected header(): AxiosHeaders | undefined {
    return new AxiosHeaders({ Authorization: `Bearer ${token}` });
  }
}
```

### `@McAxios.GET/POST/PUT/DELETE/PATCH(url, ResponseType)` — HTTP 메서드

메서드 데코레이터로 URL과 응답 타입을 지정합니다.  
응답은 자동으로 `ResponseType` 인스턴스로 변환됩니다.

```ts
@McAxios.GET("/users/{id}", UserResponse)
getUser(@McAxios.PATH id: string): Promise<UserResponse> { return this.stub(); }

@McAxios.POST("/users", UserResponse)
createUser(@McAxios.REQUEST req: CreateUserRequest): Promise<UserResponse> { return this.stub(); }
```

### `stub()` — 메서드 바디 플레이스홀더

데코레이터가 런타임에 메서드를 자동으로 교체하므로, 바디는 `return this.stub()`으로 작성합니다.  
바인딩 전 호출 시 명확한 오류 메시지를 반환합니다.

### `@McAxios.REQUEST` / `@McAxios.FORM_DATA` — 바디 파라미터

```ts
@McAxios.POST("/upload", UploadResponse)
upload(@McAxios.FORM_DATA formData: FormData): Promise<UploadResponse> { return this.stub(); }
```

### `@McAxios.PATH('key')` / `@McAxios.HEADER('key')` — 경로/헤더 파라미터

키를 생략하면 파라미터명을 자동 추론합니다.

```ts
@McAxios.GET("/users/{id}/posts/{postId}", PostResponse)
getPost(
  @McAxios.PATH id: string,
  @McAxios.PATH("postId") pid: string,
  @McAxios.HEADER("X-Lang") lang: string,
): Promise<PostResponse> { return this.stub(); }
```

### `@McAxios.SUCCESS(fn)` / `@McAxios.ERROR(fn)` — 응답 핸들러

인라인 함수 또는 Symbol 기반 메서드를 지정합니다.

```ts
static readonly ON_SUCCESS = Symbol("onSuccess");
static readonly ON_ERROR = Symbol("onError");

@McAxios.GET("/users", UserListResponse)
@McAxios.SUCCESS(UserApi.ON_SUCCESS)
@McAxios.ERROR(UserApi.ON_ERROR)
getUsers(): Promise<UserListResponse> { return this.stub(); }

@McAxios.SUCCESS_HANDLER(UserApi.ON_SUCCESS)
private async handleSuccess(response: AxiosResponse, retry: () => Promise<any>) {
  return response.data;
}

@McAxios.ERROR_HANDLER(UserApi.ON_ERROR)
private async handleError(error: any, retry: () => Promise<any>) {
  console.error(error);
}
```

### `extends McAxios.Request` — 요청 바디 클래스

`@McAxios.REQUEST`로 전달되는 객체는 `McAxios.Request`를 상속받아야 합니다.  
`@McEntity.SERIALIZE`로 마킹된 필드만 직렬화되어 전송됩니다.

### `extends McAxios.Response` — 응답 클래스

`@McEntity.ENTITY` / `@McEntity.FIELD`로 JSON 자동 매핑을 구성합니다.

---

## 예제

```ts
import McAxios from "@moca-labs/axios-kit-ts";
import { McEntity } from "@moca-labs/axios-kit-ts";
import { AxiosHeaders } from "axios";

// 요청 클래스
class CreateUserRequest extends McAxios.Request {
  @McEntity.SERIALIZE("user_name")
  userName: string;

  @McEntity.SERIALIZE
  age: number;

  constructor(userName: string, age: number) {
    super();
    this.userName = userName;
    this.age = age;
  }
}

// 응답 클래스
@McEntity.ENTITY
class UserResponse extends McAxios.Response {
  @McEntity.FIELD(String, "user_name")
  userName: string;

  @McEntity.FIELD(Number)
  age: number;
}

// API 클라이언트
class UserApi extends McAxios {
  protected header(): AxiosHeaders | undefined {
    return new AxiosHeaders({ Authorization: "Bearer my-token" });
  }

  @McAxios.GET("/users/{id}", UserResponse)
  getUser(@McAxios.PATH id: string): Promise<UserResponse> {
    return this.stub();
  }

  @McAxios.POST("/users", UserResponse)
  createUser(@McAxios.REQUEST req: CreateUserRequest): Promise<UserResponse> {
    return this.stub();
  }
}

// 사용
const api = new UserApi();

const user = await api.getUser("123");
console.log(user.userName);

const newUser = await api.createUser(new CreateUserRequest("Alice", 30));
console.log(newUser.userName);
```
