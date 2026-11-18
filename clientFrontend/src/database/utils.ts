import { supabase } from "./supabase"

export interface ResourceFilter {
    type: "notes" | "cats" | "exams" | "tutorials" | "all";
    searchTerm: string;
}

const resourceTypeMatrix = {
    "notes":1,
    "exams":2,
    "cats":3,
    "tutorials":4
}

export const getResources = async (unitId: number, filter?: ResourceFilter) => {
    try{
        const query = supabase
            .from('resources')
            .select('*, resource_types(name), units(name, code), departments(name), schools(name)')
            .eq('unit_id', unitId);
        
        if(filter){
            if(filter.searchTerm && filter.searchTerm.trim() !== ""){
                if(filter.type && filter.type !== "all"){
                    query.eq('resource_type_id', resourceTypeMatrix[filter.type]);
                }
                query.ilike('name', `%${filter.searchTerm}%`);
            }
        }

        const { data, error } = await query

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}

export const getSchools = async () => {
    try{
        const { data, error } = await supabase
            .from('schools')
            .select('*')

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}

export const getDepartments = async () => {
    try{
        const { data, error } = await supabase
            .from('departments')
            .select('*, schools(name)')

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}

export const getDepartmentsBySchoolId = async (schoolId) => {
    try{
        const { data, error } = await supabase
            .from('departments')
            .select('*, schools(name)')
            .eq('school_id', schoolId);

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}

export const getUnits = async () => {
    try{
        const { data, error } = await supabase
            .from('units')
            .select('*, departments(name)')

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}

export const getUnitsByDepartmentIdYearSemester = async (departmentId, year, semester) => {
    try{
        const { data, error } = await supabase
            .from('units')
            .select('*, departments(name)')
            .eq('department_id', departmentId)
            .eq('year_of_study', year)
            .eq('semester_of_study', semester);

        if (error) {
            throw error;
        }

        return data;
    }catch(err){
        console.error("Error fetching resources:", err);
        return null;
    }
}