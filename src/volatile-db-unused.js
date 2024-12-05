
class DB {

	entities = {}

	/// Get an entity by UUID
	read(uuid) {
		return this.entities[uuid] || null;
	}

	/// Ammend an entity by uuid
	write(entity) {
		if (!entity.uuid) {
			throw new Error("Entity must have a uuid");
		}
		let prev = this.entities[entity.uuid]
		if(!prev) {
			prev = { createdAt: performance.now() }
		}
		entity = this.entities[entity.uuid] = {
			...prev,
			...entity,
			updatedAt: performance.now()
		}
		return entity
	}

	/// Remove an entity by UUID
	obliterate(uuid) {
		delete this.entities[uuid];
	}

	/// Clear all entities
	flush() {
		this.entities = {};
	}

	query(args,callback) {

		if(args.uuid) {
			const entity = this.entities[args.uuid]
			if(entity) callback(entity)
			return
		}

		const results = []

		const query_matches = (args,candidate) => {
			for (const [key,val] of Object.entries(args)) {
				if(!candidate.hasOwnProperty(key)) return false
				if(candidate[key] instanceof Object) continue
				if(candidate[key]!==val) return false
			}
			return true
		}

		for (const [uuid,entity] of Object.entries(this.entities)) {
			if(query_matches(args,entity)) {
				callback(entity)
			}
		}
	}

}

const database = new DB();

export const db = {
	uuid: '/core/db',
	resolve: (blob) => {
		blob._sys.db = database
		if(blob.tick) return
		if(!blob.uuid) {
			//console.log("db blob no id",blob)
			return
		}
		blob._entity = database.write(blob)
	}
}





