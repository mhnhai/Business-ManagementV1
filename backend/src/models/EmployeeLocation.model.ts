import type { ILocation } from './Location.model';

/******************************************************************************
                                     Types
******************************************************************************/

/**
 * @entity employee_locations
 */
export interface IEmployeeLocation {
  userId: number;
  locationId: number;
  createdAt: Date;
}

export interface IEmployeeLocationUserSummary {
  id: number;
  username: string;
  fullName: string;
  role: string;
  department: string;
}

export interface IEmployeeLocationView extends IEmployeeLocation {
  user?: IEmployeeLocationUserSummary;
  location: ILocation;
}

export interface ISetEmployeeLocationsBody {
  locationIds: number[];
}

export interface IAssignEmployeeLocationBody {
  userId: number;
  locationId: number;
}
