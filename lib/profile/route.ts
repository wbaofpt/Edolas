export type ProfileRouteResolution =
  | { kind: "login" }
  | { kind: "profile"; username: string };

function safelyDecodeSegment(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function resolveProfileRoute(segment: string, viewerUsername: string | null | undefined): ProfileRouteResolution {
  const username = safelyDecodeSegment(segment);
  if (username === "@me") {
    return viewerUsername
      ? { kind: "profile", username: viewerUsername }
      : { kind: "login" };
  }
  return { kind: "profile", username };
}
