import { QueryClient } from 'react-query';
import { Getter } from 'jotai';
export declare type CreateQueryOptions<Options> = Options | ((get: Getter) => Options);
export declare type GetQueryClient = (get: Getter) => QueryClient;
