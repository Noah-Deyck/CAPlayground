declare module "bplist-parser" {
  const parser: { parseBuffer(buffer: ArrayBuffer | Buffer): any[] };
  export default parser;
}

declare module "bplist-creator" {
  const creator: (input: any) => ArrayBuffer | Buffer;
  export default creator;
}


