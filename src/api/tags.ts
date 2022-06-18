import { AxiosResponse } from 'axios';
import { client } from '@/api/client';

export interface TagInterface {
    id: number;
    name: string;
    icon: string|null;
    color: string|null;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface TagsResponseInterface {
    data: Array<TagInterface>;
}

export interface TagResponseInterface {
    data: TagInterface;
}

export interface TagCreateRequestInterface {
    name: string;
    icon: string|null;
    color: string|null;
}

export interface TagUpdateRequestInterface {
    name: string;
    icon: string|null;
    color: string|null;
}

export function tagsGet(): Promise<AxiosResponse<TagsResponseInterface>> {
    return client().get<TagsResponseInterface>(`/api/tags`)
}

export function tagCreate(request: TagCreateRequestInterface): Promise<AxiosResponse<TagResponseInterface>> {
    return client().post<TagResponseInterface>(`/api/tags`, {
        name: request.name,
        icon: request.icon,
        color: request.color,
    })
}

export function tagUpdate(
    tagId: number,
    request: TagUpdateRequestInterface
): Promise<AxiosResponse<TagResponseInterface>> {
    return client().put<TagResponseInterface>(`/api/tags/${tagId}`, {
        name: request.name,
        icon: request.icon,
        color: request.color,
    })
}

export function tagDelete(tagId: number): Promise<AxiosResponse> {
    return client().delete(`/api/tags/${tagId}`)
}
