
const resolvers = []

//
// An observer that remembers other observers
// @todo move this somewhere else like to an included library
//

const resolver_resolver = (blob) => {
	if(!blob.resolve) return

	// could bind optionally?
	if(false && blob.resolve.name.startsWith("bound ") == false) {
		console.log("sys resolve - since there is no binding creating one")
		blob.resolve = blob.resolve.bind(blob)
	}

	// already registered?
	for(let i = 0; i < resolvers.length ; i++ ) {
		const candidate = resolvers[i]
		let exists = blob === candidate || blob.resolve === candidate.resolve || (blob.id && blob.id === candidate.id)
		if(exists) {
			if(blob.obliterate) {
				resolvers.splice(i,1)
			}
			return
		}
	}

	// register
	resolvers.push(blob)

	console.log("sys resolve - adding resolver",blob)
}

resolvers.push( { id:'sys/resolver_resolver', resolve:resolver_resolver } )

//
// An observer that helps tidy up parent child relationships
// This helper is a 'nice to have' - arguably the burden could be on each handler
// @todo note children are not individually marked as 'obliterate' ...
// @todo move this somewhere else like to an included library
//

const family_resolver = (blob) => {

	if(blob.obliterate && blob.parent && blob.parent.children) {
		blob.parent.children = blob.parent.children.filter(item => item.id !== blob.id)
	}

	else if(blob.parent) {
		if(!blob.parent.children) blob.parent.children = []
		const found = blob.parent.children.find((item) => item === blob)
		if(!found) {
			blob.parent.children.push(blob)
		}
	}
}

resolvers.push( { id:'sys/family_resolver', resolve: family_resolver } )

//
// System primary event handling pipeline
//
// Simply passes blob through a series of handlers in order - fairly mindless.
// Does return nothing if the request was backlogged; I'm not expecting anybody to use this feature
// And returns the blob and all ammendments if was a top level interaction with no backlog
//
// A note on async:
//
// It is a nice helpful feature here to support async on individual request handler flow
// However callers here cannot necessarily know if they are in outermost scope
// Typically that means callers should call sys.resolve() not await sys.resolve()
//

const queue = []

const resolve = async (blob) => {

	// add incoming state to queue so that outsiders can reason about event ordering
	queue.push(blob)

	// if the queue is busy then return; return nothing as a way to indicate backlog
	if(queue.length > 1) {
		return null
	}

	// perform work in order - the queue can grow due to invocations below
	while(queue.length) {

		blob = queue[0]

		console.log('sys traffic:',blob.id,blob)

		// deal with this request - and allow other requests to pile up
		for(const resolver of resolvers) {
			await resolver.resolve(blob)
		}

		// deal with backlog if any
		queue.shift()
	}

	// return blob (and accumulated state) as a way to indicate completion of the round
	return blob
}

const sys = globalThis.sys = {
	id:'sys/resolver',
	resolve
}

export { sys }