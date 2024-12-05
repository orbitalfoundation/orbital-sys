
import { log,warn,err } from './log.js'

const uuid = 'orbital/sys/obliterate'

const description = 'Does nothing but does reserve the schema for obliteration as a concept'

// async function resolve(blob,sys) {
//	warn('WARN',uuid,'***** noticed a request to destroy',blob)
// }
// Object.assign(resolve,{
//	before:null,
//	after:null,
//	filter: { obliterate: true },
//	schema: { obliterate: true }
// })

const obliterate_resolver = { uuid }

export default obliterate_resolver