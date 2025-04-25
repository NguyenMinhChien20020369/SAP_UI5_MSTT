import Controller from "sap/ui/core/mvc/Controller";
import JSONModel from "sap/ui/model/json/JSONModel";
import Label from "sap/m/Label";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import PersonalizableInfo from "sap/ui/comp/smartvariants/PersonalizableInfo";
import FilterBar from "sap/ui/comp/filterbar/FilterBar";
import SmartVariantManagement from "sap/ui/comp/smartvariants/SmartVariantManagement";
import Table from "sap/m/Table";
import Event from "sap/ui/base/Event";
import FilterItem from "sap/ui/comp/filterbar/FilterItem";
import FilterGroupItem from "sap/ui/comp/filterbar/FilterGroupItem";
import Control from "sap/ui/core/Control";
import ListBinding from "sap/ui/model/ListBinding";

interface FilterData {
    groupName: string;
    fieldName: string;
    fieldData: string[];
}

export default class FilterBarPRPanel extends Controller {
    private oModel: JSONModel | null = null;
    private oSmartVariantManagement: SmartVariantManagement | null = null;
    private oExpandedLabel: Label | null = null;
    private oSnappedLabel: Label | null = null;
    private oFilterBar: FilterBar | null = null;
    private oTable: Table | null = null;

    public onInit(): void {
        // Initialize JSON model and load data
        this.oModel = new JSONModel();
        this.oModel.loadData(sap.ui.require.toUrl("ui5/mstt/localService/mockdata/Model.json"), null, false);
        this.getView()?.setModel(this.oModel);

        // Bind methods to ensure correct 'this' context
        this.applyData = this.applyData.bind(this);
        this.fetchData = this.fetchData.bind(this);
        this.getFiltersWithValues = this.getFiltersWithValues.bind(this);

        // Get controls by ID
        this.oSmartVariantManagement = this.getView()?.byId("svm") as SmartVariantManagement;
        this.oExpandedLabel = this.getView()?.byId("expandedLabel") as Label;
        this.oSnappedLabel = this.getView()?.byId("snappedLabel") as Label;
        this.oFilterBar = this.getView()?.byId("filterbar") as FilterBar;
        this.oTable = this.getView()?.byId("table") as Table;

        // Register FilterBar callbacks
        if (this.oFilterBar) {
            this.oFilterBar.registerFetchData(this.fetchData);
            this.oFilterBar.registerApplyData(this.applyData);
            this.oFilterBar.registerGetFiltersWithValues(this.getFiltersWithValues);
        }

        // Set up personalization for SmartVariantManagement
        const oPersInfo = new PersonalizableInfo({
            type: "filterBar",
            keyName: "persistencyKey",
            dataSource: "",
            control: this.oFilterBar
        });

        if (this.oSmartVariantManagement && this.oFilterBar) {
            this.oSmartVariantManagement.addPersonalizableControl(oPersInfo);
            this.oSmartVariantManagement.initialise(() => { }, this.oFilterBar);
        }
    }

    public onExit(): void {
        // Clean up references
        this.oModel = null;
        this.oSmartVariantManagement = null;
        this.oExpandedLabel = null;
        this.oSnappedLabel = null;
        this.oFilterBar = null;
        this.oTable = null;
    }

    private fetchData(): FilterData[] {
        if (!this.oFilterBar) {
            return [];
        }
        return this.oFilterBar.getAllFilterItems().reduce((aResult: FilterData[], oFilterItem: FilterItem) => {
            const oControl = oFilterItem.getControl() as Control & { getSelectedKeys?: () => string[] };
            aResult.push({
                groupName: oFilterItem.getGroupName(),
                fieldName: oFilterItem.getName(),
                fieldData: oControl.getSelectedKeys ? oControl.getSelectedKeys() : []
            });
            return aResult;
        }, []);
    }

    private applyData(aData: FilterData[]): void {
        if (!this.oFilterBar) {
            return;
        }
        aData.forEach((oDataObject: FilterData) => {
            const oControl = this.oFilterBar?.determineControlByName(oDataObject.fieldName, oDataObject.groupName) as Control & { setSelectedKeys?: (keys: string[]) => void };
            if (oControl && oControl.setSelectedKeys) {
                oControl.setSelectedKeys(oDataObject.fieldData);
            }
        }, this);
    }

    private getFiltersWithValues(): FilterGroupItem[] {
        if (!this.oFilterBar) {
            return [];
        }
        return this.oFilterBar.getFilterGroupItems().reduce((aResult: FilterGroupItem[], oFilterGroupItem: FilterGroupItem) => {
            const oControl = oFilterGroupItem.getControl() as Control & { getSelectedKeys?: () => string[] };
            if (oControl && oControl.getSelectedKeys && oControl.getSelectedKeys().length > 0) {
                aResult.push(oFilterGroupItem);
            }
            return aResult;
        }, []);
    }

    public onSelectionChange(oEvent: Event): void {
        if (this.oSmartVariantManagement && this.oFilterBar) {
            this.oSmartVariantManagement.currentVariantSetModified(true);
            this.oFilterBar.fireFilterChange(oEvent);
        }
    }

    public onSearch(): void {
        if (!this.oFilterBar || !this.oTable) {
            return;
        }
        const aTableFilters = this.oFilterBar.getFilterGroupItems().reduce((aResult: Filter[], oFilterGroupItem: FilterGroupItem) => {
            const oControl = oFilterGroupItem.getControl() as Control & { getSelectedKeys: () => string[] };
            const aSelectedKeys = oControl.getSelectedKeys();
            const aFilters = aSelectedKeys.map((sSelectedKey: string) => {
                return new Filter({
                    path: oFilterGroupItem.getName(),
                    operator: FilterOperator.Contains,
                    value1: sSelectedKey
                });
            });

            if (aSelectedKeys.length > 0) {
                aResult.push(new Filter({
                    filters: aFilters,
                    and: false
                }));
            }
            return aResult;
        }, []);
        const binding = this.oTable.getBinding("items") as ListBinding;
        binding?.filter(aTableFilters);
        this.oTable.setShowOverlay(false);
    }

    public onFilterChange(): void {
        this._updateLabelsAndTable();
    }

    public onAfterVariantLoad(): void {
        this._updateLabelsAndTable();
    }

    private getFormattedSummaryText(): string {
        if (!this.oFilterBar) {
            return "No filters active";
        }
        const aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();
        if (aFiltersWithValues.length === 0) {
            return "No filters active";
        }
        if (aFiltersWithValues.length === 1) {
            return `${aFiltersWithValues.length} filter active: ${aFiltersWithValues.join(", ")}`;
        }
        return `${aFiltersWithValues.length} filters active: ${aFiltersWithValues.join(", ")}`;
    }

    private getFormattedSummaryTextExpanded(): string {
        if (!this.oFilterBar) {
            return "No filters active";
        }
        const aFiltersWithValues = this.oFilterBar.retrieveFiltersWithValues();
        if (aFiltersWithValues.length === 0) {
            return "No filters active";
        }
        let sText = `${aFiltersWithValues.length} filters active`;
        if (aFiltersWithValues.length === 1) {
            sText = `${aFiltersWithValues.length} filter active`;
        }
        const aNonVisibleFiltersWithValues = this.oFilterBar.retrieveNonVisibleFiltersWithValues();
        if (aNonVisibleFiltersWithValues && aNonVisibleFiltersWithValues.length > 0) {
            sText += ` (${aNonVisibleFiltersWithValues.length} hidden)`;
        }
        return sText;
    }

    private _updateLabelsAndTable(): void {
        if (this.oExpandedLabel && this.oSnappedLabel && this.oTable) {
            this.oExpandedLabel.setText(this.getFormattedSummaryTextExpanded());
            this.oSnappedLabel.setText(this.getFormattedSummaryText());
            this.oTable.setShowOverlay(true);
        }
    }
}