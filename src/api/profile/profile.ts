import { CurrencyInterface } from '@/api/currency';
import { AxiosResponse } from 'axios';
import { ApiCall, Repository } from '@/api/client';
import { TypeExpense, TypeIncome } from '@/api/charges';
import { WalletsFullResponseInterface } from '@/api/wallets';

export interface ProfileRepositoryInterface {
    getStatisticsChargesFlow(): Promise<AxiosResponse<ChargesFlowStatisticsResponseInterface>>
    getStatisticsCounters(): Promise<AxiosResponse<CountersStatisticsResponseInterface>>
    getWalletsLatest(): Promise<AxiosResponse<WalletsFullResponseInterface>>
}

export class ProfileRepository extends Repository implements ProfileRepositoryInterface {

    @ApiCall()
    public getStatisticsChargesFlow(): Promise<AxiosResponse<ChargesFlowStatisticsResponseInterface>> {
        return this.client.get<ChargesFlowStatisticsResponseInterface>(`/api/profile/statistics/charges-flow`)
    }

    @ApiCall()
    public getStatisticsCounters(): Promise<AxiosResponse<CountersStatisticsResponseInterface>> {
        return this.client.get<CountersStatisticsResponseInterface>(`/api/profile/statistics/counters`)
    }

    @ApiCall()
    public getWalletsLatest(): Promise<AxiosResponse<WalletsFullResponseInterface>> {
        return this.client.get<WalletsFullResponseInterface>(`/api/profile/wallets/latest`)
    }
}

export interface ChargesFlowStatisticsResponseInterface {
    data: {
        currency: CurrencyInterface;
        [TypeIncome]: ChargesFlowTypeStatisticsInterface;
        [TypeExpense]: ChargesFlowTypeStatisticsInterface;
    };
}

export interface ChargesFlowTypeStatisticsInterface {
    type: string;
    total: number;
    lastYear: number;
    lastQuarter: number;
    lastMonth: number;
}

export interface CountersStatisticsResponseInterface {
    data: CountersStatisticsInterface;
}

export interface CountersStatisticsInterface {
    wallets: number;
    walletsArchived: number;
    charges: number;
    chargesIncome: number;
}
