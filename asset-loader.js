/**
 * AssetLoader - 通用资源加载器
 * 支持图片和音频预加载，加载失败时提供降级方案
 */
class AssetLoader {
    constructor() {
        this.images = {};
        this.sounds = {};
        this.loaded = 0;
        this.total = 0;
        this.errors = [];
    }

    /**
     * 加载所有资源
     * @param {Object} manifest - { images: {key: path}, sounds: {key: path} }
     * @returns {Promise<{images, sounds, errors}>}
     */
    async loadAll(manifest) {
        const imageKeys = Object.keys(manifest.images || {});
        const soundKeys = Object.keys(manifest.sounds || {});
        this.total = imageKeys.length + soundKeys.length;
        this.loaded = 0;
        this.errors = [];

        const promises = [];

        for (const key of imageKeys) {
            promises.push(this.loadImage(key, manifest.images[key]));
        }

        for (const key of soundKeys) {
            promises.push(this.loadSound(key, manifest.sounds[key]));
        }

        await Promise.allSettled(promises);

        return {
            images: this.images,
            sounds: this.sounds,
            errors: this.errors
        };
    }

    /**
     * 加载单张图片
     */
    loadImage(key, path) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.images[key] = img;
                this.loaded++;
                this.onProgress && this.onProgress(this.loaded, this.total, key);
                resolve(img);
            };
            img.onerror = () => {
                this.errors.push({ type: 'image', key, path });
                this.loaded++;
                this.onProgress && this.onProgress(this.loaded, this.total, key);
                reject(new Error(`Failed to load image: ${path}`));
            };
            img.src = path;
        });
    }

    /**
     * 加载单个音效
     */
    loadSound(key, path) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            audio.preload = 'auto';
            audio.oncanplaythrough = () => {
                this.sounds[key] = audio;
                this.loaded++;
                this.onProgress && this.onProgress(this.loaded, this.total, key);
                resolve(audio);
            };
            audio.onerror = () => {
                this.errors.push({ type: 'sound', key, path });
                this.loaded++;
                this.onProgress && this.onProgress(this.loaded, this.total, key);
                reject(new Error(`Failed to load sound: ${path}`));
            };
            audio.src = path;
            audio.load();
        });
    }

    /**
     * 获取已加载的图片，未加载返回 null
     */
    getImage(key) {
        return this.images[key] || null;
    }

    /**
     * 获取已加载的音效，未加载返回 null
     * 返回一个可重复播放的 Audio 克隆
     */
    getSound(key) {
        const original = this.sounds[key];
        if (!original) return null;
        // 克隆 Audio 对象以支持重叠播放
        return original.cloneNode();
    }

    /**
     * 播放音效，如果资源未加载则返回 false
     */
    playSound(key, volume = 1.0) {
        const sound = this.getSound(key);
        if (!sound) return false;
        sound.volume = volume;
        sound.currentTime = 0;
        sound.play().catch(() => {});
        return true;
    }
}
