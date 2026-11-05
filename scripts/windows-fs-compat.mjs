import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";

if (process.platform === "win32") {
  function normaliseReadlinkError(error, path) {
    if (error?.code !== "EISDIR") return error;
    try {
      if (!fs.lstatSync(path).isSymbolicLink()) {
        return Object.assign(new Error(error.message), error, { code: "EINVAL" });
      }
    } catch {
      // При изменении файла возвращаем исходную ошибку.
    }
    return error;
  }

  const readlink = fs.readlink.bind(fs);
  fs.readlink = (path, options, callback) => {
    const done = typeof options === "function" ? options : callback;
    const handle = (error, link) => done(normaliseReadlinkError(error, path), link);
    return typeof options === "function" || options === undefined
      ? readlink(path, handle)
      : readlink(path, options, handle);
  };

  const readlinkSync = fs.readlinkSync.bind(fs);
  fs.readlinkSync = (path, ...options) => {
    try {
      return readlinkSync(path, ...options);
    } catch (error) {
      throw normaliseReadlinkError(error, path);
    }
  };

  const readlinkAsync = fs.promises.readlink.bind(fs.promises);
  fs.promises.readlink = async (path, ...options) => {
    try {
      return await readlinkAsync(path, ...options);
    } catch (error) {
      throw normaliseReadlinkError(error, path);
    }
  };

  syncBuiltinESMExports();
}

