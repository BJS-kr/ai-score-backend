import { TransactionHost } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';

export type TxHost = TransactionHost<TransactionalAdapterPrisma>;
