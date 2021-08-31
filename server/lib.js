import { statSync, readdirSync } from "fs";

/**
 * Compute the total size of directory and sub-directories recursively.
 * @param {String} dir - Directory path
 * @returns {Number} Size of directory contents
 */
export const dirSize = (dir) => {
    let rds = readdirSync(dir);
    let size = 0;

    rds.forEach(filename => {
        let p = dir + filename;
        let s = statSync(p);

        if (s.isFile() && p.endsWith('.xml')) {
            size += s.size;
        } else if (s.isDirectory()) {
            size += dirSize(p + '/');
        }
    });

    return size;
};

/**
 * Get the list of file paths in the directory and sub-directories recursively.
 * @param {String} dir - Directory path
 * @returns {Array<String>} - List of file paths
 */
export const getFiles = (dir) => {
    let rds = readdirSync(dir);
    let files = [];

    rds.forEach(filename => {
        let p = dir + filename;
        let s = statSync(p);

        if (s.isFile() && p.endsWith('.xml')) {
            files.push(p);
        } else if (s.isDirectory()) {
            files = files.concat(getFiles(p + '/'));
        }
    });

    return files;
};

/**
 * Get the list of dir paths in the directory and sub-directories recursively.
 * @param {String} dir - Directory path
 * @returns {Array<String>} - List of directory paths
 */
export const getDirs = (dir) => {
    let rds = readdirSync(dir);
    let dirs = [];

    dirs.push(dir);

    rds.forEach(filename => {
        let p = dir + filename;
        let s = statSync(p);

        if (s.isDirectory()) {
            dirs = dirs.concat(getDirs(p + '/'));
        }
    });

    return dirs;
};

/**
 * Clear the same line and print msg on it. (Update line)
 * Used to show progress percent.
 * 
 * @param {String} msg 
 */
export const pocl = (msg) => {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(msg);
};

/**
 * - Convert Arabic characters to Persian
 * - Convert Arabic and Persian digits to English
 * - Replace line-break and white-space characters with normal space
 * - Keep only English and Persian characters
 * - Trim, lower-case, etc.
 * 
 * @param {String} str 
 * @returns {String}
 */
export const clean = (str) => {
    String.prototype.replaceAll = function (search, replacement) {
        return this.replace(new RegExp(search, 'g'), replacement);
    };

    str = str.replaceAll('\u064A', '\u06CC');
    str = str.replaceAll('\u0643', '\u06A9');
    str = str.replaceAll('۰', '0');
    str = str.replaceAll('۱', '1');
    str = str.replaceAll('۲', '2');
    str = str.replaceAll('۳', '3');
    str = str.replaceAll('۴', '4');
    str = str.replaceAll('۵', '5');
    str = str.replaceAll('۶', '6');
    str = str.replaceAll('۷', '7');
    str = str.replaceAll('۸', '8');
    str = str.replaceAll('۹', '9');
    str = str.replaceAll('\u0660', '0');
    str = str.replaceAll('\u0661', '1');
    str = str.replaceAll('\u0662', '2');
    str = str.replaceAll('\u0663', '3');
    str = str.replaceAll('\u0664', '4');
    str = str.replaceAll('\u0665', '5');
    str = str.replaceAll('\u0666', '6');
    str = str.replaceAll('\u0667', '7');
    str = str.replaceAll('\u0668', '8');
    str = str.replaceAll('\u0669', '9');

    str = str.replace(/\s/g, ' ');
    str = str.replace(/[^\w\sابپتءآثجچحخدذرزژسشصضطظعغفقکگلمنوهیئأؤ]/g, ' ');
    // str = str.replace(/[~`!@#$%^&*()-_=+/{}\[\]|;:'",<>?.؟]/g, ' ');

    str = str.replace(/هایی /g, ' هایی ');
    str = str.replace(/های /g, ' های ');
    str = str.replace(/ها /g, ' ها ');
    str = str.replace(/ترین /g, ' ترین ');

    str = str.replace(/ +/g, ' ');
    str = str.toLowerCase();

    return str.trim();
};