import { NullHandler } from './handler';
import { MatrixType } from './types';

export interface VariableDetails {
    description?: string;
    varnum: number;
    constant?: boolean;
    column?: number;
    scale?: number;
}

export class DymolaResultsExtractor extends NullHandler {
    private tdets: { [key: string]: VariableDetails };
    private fdets: { [key: string]: VariableDetails };
    public trajectories: { [key: string]: Array<number> | number };
    public finals: { [key: string]: number | null };
    constructor(trajs: string[], finals: string[]) {
        super();
        this.tdets = {};
        this.fdets = {};

        this.trajectories = {};
        trajs.forEach((key) => this.trajectories[key] = []);
        this.finals = {};
        finals.forEach((key) => this.finals[key] = null);
    }
    column(name: string, colnum: number, format: MatrixType, column: Array<any>, last: boolean): void {
        if (name == "name") {
            let str = new Buffer(column).toString('ascii').trim();
            if (this.trajectories.hasOwnProperty(str)) {
                this.tdets[str] = {
                    varnum: colnum,
                }
            }
            if (this.finals.hasOwnProperty(str)) {
                this.fdets[str] = {
                    varnum: colnum,
                }
            }
        }
        if (name == "description") {
            let str = new Buffer(column).toString('ascii').trim();
            Object.keys(this.tdets).forEach((key) => {
                if (this.tdets[key].column == colnum) {
                    this.tdets[key].description = str;
                }
            })
            Object.keys(this.fdets).forEach((key) => {
                if (this.fdets[key].column == colnum) {
                    this.fdets[key].description = str;
                }
            })
        }
        if (name == "dataInfo") {
            Object.keys(this.tdets).forEach((key) => {
                if (this.tdets[key].varnum == colnum) {
                    this.tdets[key].constant = column[0] == 1;
                    this.tdets[key].column = Math.abs(column[1])-1;
                    this.tdets[key].scale = column[1] >= 0 ? 1 : -1;
                }
            })
            Object.keys(this.fdets).forEach((key) => {
                if (this.fdets[key].varnum == colnum) {
                    this.fdets[key].constant = column[0] == 1;
                    this.fdets[key].column = Math.abs(column[1])-1;
                    this.fdets[key].scale = column[1] >= 0 ? 1 : -1;
                }
            })
        }

        if (name == "data_1") {
            Object.keys(this.tdets).forEach((key) => {
                if (this.tdets[key].constant) {
                    this.trajectories[key] = (this.tdets[key].scale as number)*column[this.tdets[key].column as number];
                }
            })
            Object.keys(this.fdets).forEach((key) => {
                if (this.fdets[key].constant) {
                    this.finals[key] = (this.fdets[key].scale as number)*column[this.fdets[key].column as number];
                }
            })
        }
        if (name == "data_2") {
            Object.keys(this.tdets).forEach((key) => {
                if (!this.tdets[key].constant) {
                    (this.trajectories[key] as number[]).push((this.tdets[key].scale as number)*column[this.tdets[key].column as number]);
                }
            })
            if (last) {
                Object.keys(this.fdets).forEach((key) => {
                    if (!this.fdets[key].constant) {
                        this.finals[key] = (this.fdets[key].scale as number)*column[this.fdets[key].column as number];
                    }
                })
            }
        }
    }
}
