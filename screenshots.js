const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 단지 정보 (src/lib/constants.ts의 APARTMENTS 기반)
const apartments = [
  { code: '83250121', name: '베르디움' },
  { code: '83250122', name: '호반써밋' },
  { code: '83250123', name: 'SK뷰_101-106동' },
  { code: '83250124', name: 'SK뷰_107-111동' },
  { code: '83250125', name: '랜드마크더샵_101-107동' },
  { code: '83250126', name: '랜드마크더샵_108_201-204동' },
  { code: '83250127', name: '마리나베이_101-112동' },
  { code: '83250128', name: '마리나베이_113-125동' },
  { code: '83250129', name: 'e편한세상' },
];

async function captureScreenshots() {
  // screenshots 디렉토리 생성
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
  }

  console.log('브라우저를 실행합니다...');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  for (const apt of apartments) {
    try {
      const url = `https://www.olttefood.com/order?apt=${apt.code}`;
      console.log(`\n${apt.name} (${apt.code}) 페이지를 로드합니다...`);
      console.log(`URL: ${url}`);

      // 페이지 로드
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // 추가 대기 (이미지, 폰트 등 로딩 완료 대기)
      await page.waitForTimeout(2000);

      // 스크린샷 파일명
      const filename = `screenshot-${apt.code}-${apt.name}.png`;
      const filepath = path.join(screenshotsDir, filename);

      // 전체 페이지 스크린샷 촬영
      await page.screenshot({
        path: filepath,
        fullPage: true,
      });

      console.log(`✓ 스크린샷 저장됨: ${filename}`);
    } catch (error) {
      console.error(`✗ ${apt.name} (${apt.code}) 스크린샷 실패:`, error.message);
    }
  }

  await browser.close();
  console.log('\n\n=== 모든 스크린샷 촬영 완료 ===');
  console.log(`저장 위치: ${screenshotsDir}`);
}

// 스크립트 실행
captureScreenshots().catch(console.error);
