const fs = require('fs');

const PAGE_SIZE = 4096;
const MAGIC = 'WOWO';

/**
 * Pager handles 4KB page I/O
 * Includes simple LRU Cache
 */
class Pager {
    constructor(filePath) {
        this.filePath = filePath;
        this.fd = null;
        this.cache = new Map(); // PageID -> Buffer
        this.cacheLimit = 1000; // Keep 1000 pages in memory (~4MB)
        this._open();
    }

    _open() {
        if (!fs.existsSync(this.filePath)) {
            this.fd = fs.openSync(this.filePath, 'w+');
            this._initNewFile();
        } else {
            this.fd = fs.openSync(this.filePath, 'r+');
        }
    }

    _initNewFile() {
        const buf = Buffer.alloc(PAGE_SIZE);
        buf.write(MAGIC, 0);
        buf.writeUInt32LE(1, 4); // Total Pages = 1
        buf.writeUInt32LE(0, 8); // Num Tables = 0
        fs.writeSync(this.fd, buf, 0, PAGE_SIZE, 0);
    }

    readPage(pageId) {
        if (this.cache.has(pageId)) {
            // MRI (Most Recently Used): Move to end
            const buf = this.cache.get(pageId);
            this.cache.delete(pageId);
            this.cache.set(pageId, buf);
            return buf;
        }

        const buf = Buffer.alloc(PAGE_SIZE);
        const offset = pageId * PAGE_SIZE;
        try {
            fs.readSync(this.fd, buf, 0, PAGE_SIZE, offset);
        } catch (e) {
            // Handle read past EOF or other errors gracefully if possible
            if (e.code !== 'EOF') throw e;
        }

        // Add to cache
        this.cache.set(pageId, buf);
        if (this.cache.size > this.cacheLimit) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        return buf;
    }

    writePage(pageId, buf) {
        if (buf.length !== PAGE_SIZE) throw new Error("Buffer must be 4KB");
        const offset = pageId * PAGE_SIZE;
        fs.writeSync(this.fd, buf, 0, PAGE_SIZE, offset);

        // Update cache
        this.cache.set(pageId, buf);
        // If we just updated, move to end is already handled by set
    }

    allocPage() {
        const page0 = this.readPage(0);
        const totalPages = page0.readUInt32LE(4);

        const newPageId = totalPages;
        const newTotal = totalPages + 1;

        page0.writeUInt32LE(newTotal, 4);
        this.writePage(0, page0);

        const newPage = Buffer.alloc(PAGE_SIZE);
        newPage.writeUInt32LE(0, 0); // Next Page = 0
        newPage.writeUInt16LE(0, 4); // Count = 0
        newPage.writeUInt16LE(8, 6); // Free Offset = 8
        this.writePage(newPageId, newPage);

        return newPageId;
    }

    close() {
        if (this.fd !== null) {
            fs.closeSync(this.fd);
            this.fd = null;
            this.cache.clear();
        }
    }
}

Pager.PAGE_SIZE = PAGE_SIZE;

module.exports = Pager;
