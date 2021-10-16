import { CurrencyInterface } from '@/api/currency';
import { AxiosResponse } from 'axios';
import { client } from '@/api/client';
import { TypeExpense, TypeIncome } from '@/api/charges';
import { WalletsResponseInterface } from '@/api/wallets';

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

export function profileStatisticsChargesFlowGet(): Promise<AxiosResponse<ChargesFlowStatisticsResponseInterface>> {
    return client().get<ChargesFlowStatisticsResponseInterface>(`/api/profile/statistics/charges-flow`)
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

export function profileStatisticsCountersGet(): Promise<AxiosResponse<CountersStatisticsResponseInterface>> {
    return client().get<CountersStatisticsResponseInterface>(`/api/profile/statistics/counters`)
}

export function profileWalletsLatestGet(): Promise<AxiosResponse<WalletsResponseInterface>> {
    return client().get<WalletsResponseInterface>(`/api/profile/wallets/latest`)
}
