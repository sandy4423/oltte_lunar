/**
 * 유입 경로 트래킹 타입
 */

export type TrafficSource = 'carrot' | 'banner' | 'threads' | 'aptner' | 'etc';

export const TRAFFIC_SOURCE_LABELS: Record<TrafficSource, string> = {
  carrot: '당근마켓',
  banner: '현수막',
  threads: '쓰레드',
  aptner: '아파트너',
  etc: '기타',
};

export function isValidSource(source: string | null): source is TrafficSource {
  if (!source) return false;
  return ['carrot', 'banner', 'threads', 'aptner', 'etc'].includes(source);
}
