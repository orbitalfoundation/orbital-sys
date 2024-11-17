
import { log,warn,err } from './log.js'

const uuid = 'orbital/sys/schema'

function resolve(blob,sys) {
	if(!blob || !blob.resolve || !blob.resolve.schema) return
	console.log("...schema saw",blob.resolve.schema)
	if( typeof blob.resolve.schema !== 'object') {
		err(uuid,'schemas must be objects',blob)
		return
	}
	if(!sys._schemas) sys._schemas = {}
	Object.entries(blob.resolve.schema).forEach( ([k,v]) => {
		const existing = sys._schemas[k]
		if(existing && existing != blob) {
			err(uuid,'schema namespace collision',blob,'previous was',existing)
			return
		}
		sys._schemas[k] = blob
	})
}

export default { uuid, resolve }
