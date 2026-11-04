import { cpSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative } from 'node:path';

export class OutputDirectory {
  #root;
  #written = [];

  constructor(root) {
    this.#root = root;
  }

  get root() {
    return this.#root;
  }

  get writtenFiles() {
    return [...this.#written];
  }

  resolve(relativePath) {
    return `${this.#root}/${relativePath}`;
  }

  clear(relativePath = '') {
    rmSync(this.resolve(relativePath), { recursive: true, force: true });
  }

  write(relativePath, contents) {
    const target = this.resolve(relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, contents);
    this.#written.push(relativePath);
    return target;
  }

  copy(source, relativePath) {
    const target = this.resolve(relativePath);
    mkdirSync(dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true });
    this.#written.push(relativePath);
    return target;
  }

  link(relativePath, pointsTo) {
    const target = this.resolve(relativePath);
    mkdirSync(dirname(target), { recursive: true });
    rmSync(target, { force: true, recursive: true });
    symlinkSync(pointsTo, target);
    return target;
  }

  subdirectory(relativePath) {
    return new OutputDirectory(this.resolve(relativePath));
  }

  describe(relativePath) {
    return relative(process.cwd(), this.resolve(relativePath)) || '.';
  }
}
