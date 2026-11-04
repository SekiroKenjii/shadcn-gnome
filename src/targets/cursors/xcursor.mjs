const MAGIC = 0x72756358;
const IMAGE_CHUNK = 0xfffd0002;
const FILE_HEADER_BYTES = 16;
const TOC_ENTRY_BYTES = 12;
const IMAGE_HEADER_BYTES = 36;

// images: [{ nominalSize, width, height, xhot, yhot, delay, rgba }] where rgba is
// premultiplied RGBA8, the order resvg renders in.
export function encodeXcursor(images) {
  const imageBytes = images.map((image) => IMAGE_HEADER_BYTES + image.width * image.height * 4);
  const tocBytes = images.length * TOC_ENTRY_BYTES;
  const total = FILE_HEADER_BYTES + tocBytes + imageBytes.reduce((sum, bytes) => sum + bytes, 0);
  const buffer = Buffer.alloc(total);

  buffer.writeUInt32LE(MAGIC, 0);
  buffer.writeUInt32LE(FILE_HEADER_BYTES, 4);
  buffer.writeUInt32LE(0x00010000, 8);
  buffer.writeUInt32LE(images.length, 12);

  let position = FILE_HEADER_BYTES + tocBytes;
  images.forEach((image, index) => {
    const toc = FILE_HEADER_BYTES + index * TOC_ENTRY_BYTES;
    buffer.writeUInt32LE(IMAGE_CHUNK, toc);
    buffer.writeUInt32LE(image.nominalSize, toc + 4);
    buffer.writeUInt32LE(position, toc + 8);
    writeImage(buffer, position, image);
    position += imageBytes[index];
  });
  return buffer;
}

function writeImage(buffer, offset, image) {
  const fields = [IMAGE_HEADER_BYTES, IMAGE_CHUNK, image.nominalSize, 1, image.width, image.height, image.xhot, image.yhot, image.delay];
  for (const [i, value] of fields.entries()) buffer.writeUInt32LE(value, offset + i * 4);
  let pixel = offset + IMAGE_HEADER_BYTES;
  for (let i = 0; i < image.rgba.length; i += 4) {
    buffer[pixel] = image.rgba[i + 2];
    buffer[pixel + 1] = image.rgba[i + 1];
    buffer[pixel + 2] = image.rgba[i];
    buffer[pixel + 3] = image.rgba[i + 3];
    pixel += 4;
  }
}

export function decodeXcursorHeader(buffer) {
  if (buffer.readUInt32LE(0) !== MAGIC) throw new Error('not an Xcursor file');
  const count = buffer.readUInt32LE(12);
  return Array.from({ length: count }, (_, index) => {
    const toc = FILE_HEADER_BYTES + index * TOC_ENTRY_BYTES;
    const position = buffer.readUInt32LE(toc + 8);
    return {
      nominalSize: buffer.readUInt32LE(toc + 4),
      width: buffer.readUInt32LE(position + 16),
      height: buffer.readUInt32LE(position + 20),
      xhot: buffer.readUInt32LE(position + 24),
      yhot: buffer.readUInt32LE(position + 28),
      delay: buffer.readUInt32LE(position + 32),
    };
  });
}
