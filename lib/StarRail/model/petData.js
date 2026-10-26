/** 同一 pet_id 的不同 appearance_id 是独立款式；重复拥有只累加数量。 */
export function buildPetGroups (data = {}) {
  const groups = (data.pet_group_list || []).map(group => ({ name: group.pool_name, list: group.pet_list || [] }))
  groups.push({ name: "常规随宠", list: data.normal_pet_list || [] })
  return groups.map(group => {
    const pets = new Map()
    for (const pet of group.list) {
      const key = `${pet.pet_id}:${pet.appearance_id ?? "0"}`
      if (pets.has(key)) pets.get(key).count++
      else pets.set(key, { ...pet, count: 1 })
    }
    return { name: group.name, pets: [...pets.values()] }
  }).filter(group => group.pets.length)
}
