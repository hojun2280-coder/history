# World Story Illustrator

[![Open in IDX](https://cdn.idx.dev/btn/open.svg)](https://idx.google.com/import?url=https://github.com/YOUR_USERNAME/YOUR_REPO_NAME)

> **Note**: To use the "Open in IDX" button, please push this project to a public GitHub repository first, then update the link above with your repository URL. (세계사 프롬프트 메이커)

AI를 활용해 세계사 스토리보드를 제작하는 웹 애플리케이션입니다.

## 🚀 배포 방법 (Deployment)

이 프로젝트를 Vercel에 배포하여 인터넷에서 접속할 수 있습니다.

### 1. Vercel 계정 생성 및 CLI 설치
Vercel에 가입 후, 터미널에서 Vercel CLI를 설치합니다.
```bash
npm i -g vercel
```

### 2. 프로젝트 배포
터미널에서 다음 명령어를 실행하여 배포를 시작합니다.
```bash
vercel
```
- 질문에는 모두 기본값(Enter)을 선택하면 됩니다.
- 배포가 완료되면 `Production: https://...` 주소가 출력됩니다.

### 3. 환경 변수 설정 (중요!)
배포된 사이트에서 AI 기능을 사용하려면 API 키를 설정해야 합니다.

1. [Vercel 대시보드](https://vercel.com/dashboard)로 이동합니다.
2. 배포된 프로젝트를 클릭하고 **Settings** > **Environment Variables** 메뉴로 들어갑니다.
3. 다음 변수를 추가합니다:
   - **Key**: `GEMINI_API_KEY`
   - **Value**: (당신의 Google Gemini API Key)
4. 저장 후, **Deployments** 탭으로 가서 최신 배포를 **Redeploy** 하거나 다시 `vercel --prod` 명령어를 실행해야 적용됩니다.

## 🛠️ 개발 시작 (Local Development)

```bash
npm install
npm run dev
```

## Google Project IDX (AI Studio)

이 프로젝트는 **Google Project IDX**를 지원합니다. IDX에서 실행하면 `window.aistudio` 기능을 통해 API 키를 쉽게 연결할 수 있습니다.

1. 이 프로젝트를 본인의 GitHub 저장소에 업로드(Push)합니다.
2. [Project IDX](https://idx.google.com)에 접속합니다.
3. "Import a repo"를 선택하고 본인의 저장소를 입력합니다.
4. 프로젝트가 열리면 자동으로 환경이 설정됩니다.
# history
