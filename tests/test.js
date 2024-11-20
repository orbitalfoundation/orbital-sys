// @todo this will become a test suite

import '../sys.js'

// resolvers can be declared as functions with their own 'this' scope
const resolve = function (blob) {
	const uuid = this ? this.uuid : 'no-self!'
	console.log(uuid,"noticed an event",blob.uuid)
}

// a resolver can be decorated with a filter as a convenience to reduce noise
resolve.filter = { graceful: true }

// an entity with a resolver component
const alpha = { uuid:"alpha", resolve }

// register the entity and the resolver, note the resolver is not called on the self registration event
await sys.resolve(alpha)

// another entity that catches all traffic - no filter
const beta = {
	uuid:"beta",
	clumsy: true,
	resolve: (blob) => { console.log("beta noticed an event",blob) }
}

// registering this entity should invoke the resolver on alpha if was graceful only
await sys.resolve(beta)

// repurposing a resolver that will resolve on happy
const charlie = { uuid:"charlie" }
charlie.resolve = resolve.bind(charlie)
charlie.resolve.filter = { happy: true }
charlie.resolve.before = "alpha"
await sys.resolve(charlie)

// destroying an entity and a resolver associated with it
alpha.obliterate = true
await sys.resolve(alpha)

// send an event in general just for fun
await sys.resolve({uuid:"happy",happy:true})

await sys.resolve({
	load: [ "./test2.js" ]
})

await sys.resolve({puppy:true})

console.log(sys._resolvers)









