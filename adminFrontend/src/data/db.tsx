import { supabase } from "./supabase"

interface UploadResponse {
    status: 'success' | 'error';
    data: any | null;
    error: any | null;
    public_access_url: string | null;
    file_path: string | null;
}

export const uploadFile = async (file: File): Promise<UploadResponse> => {
    console.log('Uploading file:')
    try {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 9);
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `${timestamp}_${randomString}_${sanitizedName}`;

        const { data, error } = await supabase.storage
            .from("notes2")
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type || 'application/octet-stream',
            });

        if (error) {
            throw error;
        }

        const publicUrlResponse = supabase.storage
            .from("notes2")
            .getPublicUrl(data.path);

        return {
            status: 'success',
            data: data,
            error: null,
            public_access_url: publicUrlResponse.data.publicUrl,
            file_path: data.path
        };

    } catch (error) {
        console.error('Upload error:', error);
        return {
            status: 'error',
            data: null,
            error: error,
            public_access_url: null,
            file_path: null
        };
    }
};

/** Set for institution admins: every read/insert is limited to this institution. */
let institutionScope: number | null = null
export const setInstitutionScope = (id: number | null) => { institutionScope = id }

/** Set for course admins: departments, units and resources are limited to these department ids (their courses). */
let courseScope: number[] | null = null
export const setCourseScope = (ids: number[] | null) => { courseScope = ids }

/** Set for school admins: everything is limited to these school ids (and the departments, units and resources under them). */
let schoolScope: number[] | null = null
export const setSchoolScope = (ids: number[] | null) => { schoolScope = ids }

const INSTITUTION = 'institutions(id, short_name)'

export const getRecords = async (schema, options: { institution_id?: number, department_id?: number, unit_id?: number, resource_type_id?: number, page?: number, pageSize?: number, search?: string } = {}): Promise<{ data: any[], meta: { total: number, page: number, pageSize: number, lastPage: number } }> => {
    try {
        const page = options.page || 1;
        const pageSize = options.pageSize || 10;
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        let query = supabase.from(schema).select(schema === 'schools' ? `*, ${INSTITUTION}` : '*', { count: 'exact' });

        if (schema == "departments") {
            query = supabase.from(schema).select(`*, schools(id, name), ${INSTITUTION}`, { count: 'exact' });
        } else if (schema == "units") {
            query = supabase.from(schema).select(`*, departments(id, name, schools(id, name)), ${INSTITUTION}`, { count: 'exact' });

            if (options.department_id && options.department_id > 0) {
                query = query.eq('department_id', options.department_id);
            }

        } else if (schema == "resources") {
            query = supabase.from(schema).select(`*, units(id, name), departments(id, name), schools(id, name), resource_types(id, name), ${INSTITUTION}`, { count: 'exact' });

            if (options.unit_id && options.unit_id > 0) {
                query = query.eq('unit_id', options.unit_id);
            }

            if (options.resource_type_id && options.resource_type_id > 0) {
                query = query.eq('resource_type_id', options.resource_type_id);
            }
        }

        if (institutionScope !== null) {
            query = query.eq(schema === 'institutions' ? 'id' : 'institution_id', institutionScope);
        }

        // Explicit filter from the page (super admins); scoped admins are already limited above.
        if (options.institution_id && options.institution_id > 0 && schema !== 'institutions') {
            query = query.eq('institution_id', options.institution_id);
        }

        // A school admin sees only their own schools, and what sits under them.
        if (schoolScope !== null) {
            const ids = schoolScope.length ? schoolScope : [-1]
            if (schema === 'schools') query = query.in('id', ids)
            else if (schema === 'departments') query = query.in('school_id', ids)
            else if (schema === 'units' || schema === 'resources') {
                const { data: d } = await supabase.from('departments').select('id').in('school_id', ids)
                query = query.in('department_id', (d ?? []).map((r) => r.id).concat(-1))
            }
        }

        // A course admin sees only their own courses (and the school above them), never a sibling course.
        if (courseScope !== null) {
            const ids = courseScope.length ? courseScope : [-1]
            if (schema === 'departments') query = query.in('id', ids)
            else if (schema === 'units' || schema === 'resources') query = query.in('department_id', ids)
            else if (schema === 'schools') {
                const { data: d } = await supabase.from('departments').select('school_id').in('id', ids)
                query = query.in('id', [...new Set((d ?? []).map((r) => r.school_id))].concat(-1))
            }
        }

        if (options.search) {
            const searchTerm = `%${options.search}%`;
            if (schema === 'institutions') {
                query = query.or(`name.ilike.${searchTerm},short_name.ilike.${searchTerm}`);
            } else if (['schools', 'departments', 'units'].includes(schema)) {
                query = query.or(`name.ilike.${searchTerm},code.ilike.${searchTerm}`);
            } else if (schema === 'resources') {
                query = query.ilike('name', searchTerm);
            }
        }

        const { data, error, count } = await query
            .range(from, to)
            .order('id', { ascending: false }); // Default order by newest

        if (error) throw error

        return {
            data: data,
            meta: {
                total: count,
                page: page,
                pageSize: pageSize,
                lastPage: count ? Math.ceil(count / pageSize) : 0
            }
        };
    } catch (error) {
        console.log(error)
        // Return empty structure to avoid breaking UI completely on error
        return {
            data: [],
            meta: { total: 0, page: 1, pageSize: 10, lastPage: 0 }
        };
    }
}

export const addRecord = async (schema, insertData) => {
    try {
        // Children inherit their institution in the database; schools need it explicitly.
        const row = institutionScope !== null && schema !== 'institutions' ? { institution_id: institutionScope, ...insertData } : insertData
        const { data, error } = await supabase
            .from(schema)
            .insert([row])
            .select();

        if (error) throw error
        return {
            status: 'success',
            error: null,
            data: data[0]
        }
    } catch (error) {
        console.log(error)
        return {
            status: 'error',
            error: error,
            data: null
        }
    }
}

export const updateRecord = async (schema, id: number, updateData) => {
    try {
        const { data, error } = await supabase
            .from(schema)
            .update(updateData)
            .eq("id", id)
            .select();

        if (error) throw error
        return {
            status: 'success',
            error: null,
            data: data[0]
        }
    } catch (error) {
        console.log(error)
        return {
            status: 'error',
            error: error,
            data: null
        }
    }
}

export const deleteRecord = async (schema, id: number) => {
    try {
        const { data, error } = await supabase
            .from(schema)
            .delete()
            .eq("id", id)
            .select();
        if (error) throw error
        return {
            status: 'success',
            error: null,
            data: data[0]
        }
    } catch (error) {
        console.log(error)
        return {
            status: 'error',
            error: error,
            data: null
        }
    }
}



export interface Topic { id: number; unit_id: number; position: number; title: string; description: string | null }

/** A unit's syllabus, in order. Throws, so callers can tell "no topics" from "topics table missing". */
export const getTopics = async (unitId: number): Promise<Topic[]> => {
    const { data, error } = await supabase.from('topics').select('*').eq('unit_id', unitId).order('position')
    if (error) throw error
    return data ?? []
}

/** Uploads an image to the same bucket as resources and returns its public URL. */
export const uploadImage = async (file: File): Promise<string> => {
    const res = await uploadFile(file)
    if (res.status === 'error' || !res.public_access_url) throw res.error ?? new Error('Upload failed')
    return res.public_access_url
}
