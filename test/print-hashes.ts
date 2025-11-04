import { getHashes } from 'node:crypto'

console.log(getHashes()); // ['DSA', 'DSA-SHA', 'DSA-SHA1', ...]
