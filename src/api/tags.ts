import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';

export interface TagInterface {
    id: number;
    name: string;
    icon: string|null;
    color: string|null;
    userId: number;
    createdAt: string;
    updatedAt: string;
}

export interface TagsRepositoryInterface {
    get(): Promise<AxiosResponse<TagsResponseInterface>>
    getCommons(): Promise<AxiosResponse<TagsResponseInterface>>
    getCommon(tagId: number): Promise<AxiosResponse<TagResponseInterface>>
    getSuggestions(query: string): Promise<AxiosResponse<TagsResponseInterface>>
    create(request: TagCreateRequestInterface): Promise<AxiosResponse<TagResponseInterface>>
    update(tagId: number, request: TagUpdateRequestInterface): Promise<AxiosResponse<TagResponseInterface>>
    delete(tagId: number): Promise<AxiosResponse>
}

export class TagsRepository extends Repository implements TagsRepositoryInterface {

    @ApiCall()
    public get(): Promise<AxiosResponse<TagsResponseInterface>> {
        return this.client.get<TagsResponseInterface>(`/api/tags`)
    }

    @ApiCall()
    public getCommons(): Promise<AxiosResponse<TagsResponseInterface>> {
        return this.client.get<TagsResponseInterface>(`/api/tags/common`)
    }

    @ApiCall()
    public getCommon(tagId: number): Promise<AxiosResponse<TagResponseInterface>> {
        return this.client.get<TagResponseInterface>(`/api/tags/common/${tagId}`)
    }

    @ApiCall()
    public getSuggestions(query: string): Promise<AxiosResponse<TagsResponseInterface>> {
        return this.client.get<TagsResponseInterface>(`/api/tags/suggestions/${query}`)
    }

    @ApiCall()
    public create(request: TagCreateRequestInterface): Promise<AxiosResponse<TagResponseInterface>> {
        return this.client.post<TagResponseInterface>(`/api/tags`, {
            name: request.name,
            icon: request.icon,
            color: request.color,
        })
    }

    @ApiCall()
    public update(tagId: number, request: TagUpdateRequestInterface): Promise<AxiosResponse<TagResponseInterface>> {
        return this.client.put<TagResponseInterface>(`/api/tags/${tagId}`, {
            name: request.name,
            icon: request.icon,
            color: request.color,
        })
    }

    @ApiCall()
    public delete(tagId: number): Promise<AxiosResponse> {
        return this.client.delete(`/api/tags/${tagId}`)
    }
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
