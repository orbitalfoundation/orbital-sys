import { log,warn,err } from './log.js'

const uuid = "orbital/sys/resolve"

const resolve = (blob,sys) => {

	// ignore traffic not for us
	if(!blob.resolve) return

	// hack: store our list of resolvers in sys to allow multiple instances of sys
	// @todo some concept of state per instance of sys might be a useful idea?
	if(!sys._resolvers) sys._resolvers = []
	const resolvers = sys._resolvers

	// find previous
	for(let i = 0; i < resolvers.length ; i++ ) {
		const candidate = resolvers[i]
		let includes = blob === candidate || blob.resolve === candidate.resolve
		if(includes) {
			if(blob.obliterate) {
				//warn('WARN',uuid,'removing resolver',blob)
				resolvers.splice(i,1)
			} else {
				err('ERROR',uuid,'duplicate resolver',blob)
			}
			return
		}
	}

	// insert specifically
	if(blob.resolve.before || blob.resolve.after) {
		for(let i = 0; i < resolvers.length; i++) {
			const resolver = resolvers[i]
			if(!blob.resolve) continue
			if(blob.resolve.before && resolver.uuid && resolver.uuid === blob.resolve.before) {
				resolvers.splice(i,0,blob)
				return
			}
			if(blob.resolve.after && resolver.uuid && resolver.uuid === blob.resolve.after) {
				resolvers.splice(i+1,0,blob)
				return
			}
		}
	}

	// insert after
	resolvers.push(blob)
}

resolve.filter = { resolve: true }

export default { uuid, resolve }

