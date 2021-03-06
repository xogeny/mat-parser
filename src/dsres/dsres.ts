import { NullHandler, MatrixType } from '../parser';

export interface VariableDetails {
    description?: string;
    varnum: number;
    constant?: boolean;
    column?: number;
    scale?: number;
}

function trim(a: Array<any>): string {
    let buf = new Buffer(a);
    let str = buf.toString('ascii');
    str = str.replace(/\0/g, "");
    return str.trim();
}

export class DymolaSignalExtractor extends NullHandler {
    protected columns: { [colnum: number]: string } = {};
    public descriptions: { [signal: string]: string } = {};
    column(name: string, colnum: number, format: MatrixType, column: Array<any>, last: boolean): void {
        if (name == "name") {
            let str = trim(column);
            this.columns[colnum] = str;
        }
        if (name == "description") {
            let name = this.columns[colnum];
            let desc = trim(column);
            this.descriptions[name] = desc;
        }
    }
    end(name: string): boolean {
        if (name == "description") {
            return true;
        }
        return false;
    }
}

export class DymolaResultsExtractor extends NullHandler {
    private tdets: { [key: string]: VariableDetails };
    private fdets: { [key: string]: VariableDetails };
    private tcols: { [key: number]: string };
    private fcols: { [key: number]: string };
    public trajectories: { [key: string]: Array<number> | number };
    public finals: { [key: string]: number | null };
    constructor(protected trajPredicate: (name: string) => boolean, protected finalPredicate: (name: string) => boolean) {
        super();
        this.tdets = {};
        this.fdets = {};
        this.tcols = {};
        this.fcols = {};

        this.trajectories = {};
        this.finals = {};
    }
    column(name: string, colnum: number, format: MatrixType, column: Array<any>, last: boolean): void {
        if (name == "name") {
            let str = trim(column);
            if (this.trajPredicate(str)) {
                this.tdets[str] = {
                    varnum: colnum,
                }
                this.tcols[colnum] = str;
                this.trajectories[str] = [];
            }

            if (this.finalPredicate(str)) {
                this.fdets[str] = {
                    varnum: colnum,
                }
                this.fcols[colnum] = str;
                this.finals[str] = null;
            }
        }
        if (name == "description") {
            if (this.tcols.hasOwnProperty(colnum)) {
                let name = this.tcols[colnum];
                let str = trim(column);
                this.tdets[name].description = str;
            }
            if (this.fcols.hasOwnProperty(colnum)) {
                let name = this.fcols[colnum];
                let str = trim(column);
                this.fdets[name].description = str;
            }
        }
        if (name == "dataInfo") {
            if (this.tcols.hasOwnProperty(colnum)) {
                let key = this.tcols[colnum];
                this.tdets[key].constant = column[0] == 1;
                this.tdets[key].column = Math.abs(column[1]) - 1;
                this.tdets[key].scale = column[1] >= 0 ? 1 : -1;
            }
            if (this.fcols.hasOwnProperty(colnum)) {
                let key = this.fcols[colnum];
                this.fdets[key].constant = column[0] == 1;
                this.fdets[key].column = Math.abs(column[1]) - 1;
                this.fdets[key].scale = column[1] >= 0 ? 1 : -1;
            }
        }

        if (name == "data_1") {
            Object.keys(this.tdets).forEach((key) => {
                if (this.tdets[key].constant) {
                    this.trajectories[key] = (this.tdets[key].scale as number) * column[this.tdets[key].column as number];
                }
            })
            Object.keys(this.fdets).forEach((key) => {
                if (this.fdets[key].constant) {
                    this.finals[key] = (this.fdets[key].scale as number) * column[this.fdets[key].column as number];
                }
            })
        }
        if (name == "data_2") {
            Object.keys(this.tdets).forEach((key) => {
                if (!this.tdets[key].constant) {
                    (this.trajectories[key] as number[]).push((this.tdets[key].scale as number) * column[this.tdets[key].column as number]);
                }
            })
            if (last) {
                Object.keys(this.fdets).forEach((key) => {
                    if (!this.fdets[key].constant) {
                        this.finals[key] = (this.fdets[key].scale as number) * column[this.fdets[key].column as number];
                    }
                })
            }
        }
    }
}
