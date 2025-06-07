class AudioEncryptor {
  constructor() {
    this.libraryHandlers = new Map();
    this.name = "tweetnacl";
  }

  async loadLibrary(name) {
    try {
      const lib = await import(name);
      if (name === 'libsodium-wrappers') {
        await lib.default.ready;
      }
      const libraryHandler = this.createLibraryHandler(name, lib.default);
      this.registerLibraryHandler(name, libraryHandler);
      return libraryHandler;
    } catch (error) {
      console.error(`Failed to load library: ${name}`, error);
      return null;
    }
  }

  createLibraryHandler(name, lib) {
    switch (name) {
      case 'sodium-native':
      case 'sodium-javascript':
        return {
          open: (buffer, nonce, key) => {
            if (key.length !== lib.crypto_secretbox_KEYBYTES) {
              throw new Error('Invalid key size for sodium library');
            }
            const output = Buffer.allocUnsafe(buffer.length - lib.crypto_secretbox_MACBYTES);
            lib.crypto_secretbox_open_easy(output, buffer, nonce, key);
            return output;
          },
          close: (buffer, nonce, key) => {
            if (key.length !== lib.crypto_secretbox_KEYBYTES) {
              throw new Error('Invalid key size for sodium library');
            }
            const output = Buffer.allocUnsafe(buffer.length + lib.crypto_secretbox_MACBYTES);
            lib.crypto_secretbox_easy(output, buffer, nonce, key);
            return output;
          },
          random: (number) => {
            const output = Buffer.allocUnsafe(number);
            lib.randombytes_buf(output);
            return output;
          }
        };

      case 'libsodium-wrappers':
        return {
          open: (buffer, nonce, key) => {
            if (key.length !== lib.crypto_secretbox_KEYBYTES) {
              throw new Error('Invalid key size for libsodium-wrappers');
            }
            return lib.crypto_secretbox_open_easy(buffer, nonce, key);
          },
          close: (buffer, nonce, key) => {
            if (key.length !== lib.crypto_secretbox_KEYBYTES) {
              throw new Error('Invalid key size for libsodium-wrappers');
            }
            return lib.crypto_secretbox_easy(buffer, nonce, key);
          },
          random: (number) => lib.randombytes_buf(number)
        };

      case 'tweetnacl':
        return {
          open: (buffer, nonce, key) => {
            // Ensure key is a Uint8Array and is of size 32 bytes
            if (!(key instanceof Uint8Array) || key.length !== 32) {
              throw new Error('Invalid key size for tweetnacl');
            }
            return lib.secretbox.open(buffer, nonce, key);
          },
          close: (buffer, nonce, key) => {
            // Ensure key is a Uint8Array and is of size 32 bytes
            if (!(key instanceof Uint8Array) || key.length !== 32) {
              throw new Error('Invalid key size for tweetnacl');
            }
            return lib.secretbox(buffer, nonce, key);
          }
        };

          default:
        throw new Error(`Unsupported library: ${name}`);
    }
  }

  registerLibraryHandler(name, handler) {
    this.libraryHandlers.set(name, handler);
  }

  async initialize(name) {
    if (name) this.name = name;
    const libFunctions = await this.loadLibrary(this.name);
    if (libFunctions) {
      return;
    }
    throw new Error('Could not load any sodium library');
  }

  executeMethod(name, ...args) {
    const handler = this.libraryHandlers.get(this.name);
    if (!handler) {
      throw new Error(`Library handler not found for: ${this.name}`);
    }
    const method = handler[name];
    if (!method) {
      throw new Error(`Method not found in handler: ${name}`);
    }
    return method(...args);
  }
}

export default AudioEncryptor;
