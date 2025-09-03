declare module 'qrcode' {
  const QRCode: {
    toCanvas(canvas: HTMLCanvasElement, text: string, opts?: any, cb?: (err?: unknown) => void): void
  }
  export default QRCode
}


