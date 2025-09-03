export async function loadAnime(): Promise<any> {
  const mod = await import('animejs')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return mod.default
}

export async function loadAnimeModule(): Promise<any> {
  return import('animejs')
}


