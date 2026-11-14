// Generated from Python contracts. Do not edit; run python scripts/dev.py contracts.
export interface paths {
    readonly "/api/v1/field/{variable_id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Monthly Field */
        readonly get: operations["monthly_field_api_v1_field__variable_id__get"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/api/v1/geocode": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Lookup */
        readonly get: operations["lookup_api_v1_geocode_get"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/api/v1/health": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Health */
        readonly get: operations["health_api_v1_health_get"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/api/v1/regional-series/{variable_id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Regional Series */
        readonly get: operations["regional_series_api_v1_regional_series__variable_id__get"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
    readonly "/api/v1/series/{variable_id}": {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        /** Point Series */
        readonly get: operations["point_series_api_v1_series__variable_id__get"];
        readonly put?: never;
        readonly post?: never;
        readonly delete?: never;
        readonly options?: never;
        readonly head?: never;
        readonly patch?: never;
        readonly trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** ActiveJob */
        readonly ActiveJob: {
            /** Attempt */
            readonly attempt: number;
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Job Id */
            readonly job_id: string;
            /** Progress */
            readonly progress: number | null;
            /** Progress Reason */
            readonly progress_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Provider Job Ids */
            readonly provider_job_ids: readonly string[];
            /** Request Hash */
            readonly request_hash: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Stage */
            readonly stage: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly state: "queued" | "running" | "waiting_provider";
            /** Status Url */
            readonly status_url: string;
            /**
             * Updated At
             * Format: date-time
             */
            readonly updated_at: string;
        };
        /** AnalysedRow */
        readonly AnalysedRow: {
            readonly actual_window: components["schemas"]["MonthlyWindow"];
            readonly grade: components["schemas"]["Grade"];
            readonly primary_test: components["schemas"]["AvailableTest"];
            /** Result Id */
            readonly result_id: string;
            readonly standardized_slope: components["schemas"]["Estimate"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "analysed";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** AnalysisBranch */
        readonly AnalysisBranch: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            readonly diagnostics: components["schemas"]["RegressionDiagnostics"] | null;
            /** Diagnostics Reason */
            readonly diagnostics_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Estimates */
            readonly estimates: readonly components["schemas"]["Estimate"][];
            /**
             * Frequency
             * @enum {string}
             */
            readonly frequency: "monthly" | "annual";
            /** Series Id */
            readonly series_id: string;
            /** Tests */
            readonly tests: readonly components["schemas"]["TestResult"][];
            /**
             * Transform
             * @enum {string}
             */
            readonly transform: "raw" | "anomaly" | "log10_anomaly" | "annual_anomaly";
        };
        /** AnalysisRequest */
        readonly AnalysisRequest: {
            /** Alpha */
            readonly alpha: number;
            /** Baseline */
            readonly baseline: components["schemas"]["WindowBaseline"] | components["schemas"]["ExplicitBaseline"];
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Method Profile
             * @constant
             */
            readonly method_profile: "srs-p0-v1";
            readonly region: components["schemas"]["RegionSpec"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** AnalysisResult */
        readonly AnalysisResult: {
            /**
             * Analysis Status
             * @enum {string}
             */
            readonly analysis_status: "available" | "unavailable";
            /** Binding Id */
            readonly binding_id: string;
            /** Branches */
            readonly branches: readonly components["schemas"]["AnalysisBranch"][];
            /** Caveat Ids */
            readonly caveat_ids: readonly string[];
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Data Release Id */
            readonly data_release_id: string;
            readonly detectability: components["schemas"]["Detectability"];
            /**
             * Evidence Kind
             * @enum {string}
             */
            readonly evidence_kind: "scientific" | "synthetic_contract";
            readonly fdr: components["schemas"]["FdrResult"] | null;
            /** Fdr Reason */
            readonly fdr_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            readonly grade: components["schemas"]["Grade"];
            /**
             * Mode
             * @enum {string}
             */
            readonly mode: "local" | "snapshot";
            /** Physical Units */
            readonly physical_units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /**
             * Primary Branch
             * @enum {string}
             */
            readonly primary_branch: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Provenance Map */
            readonly provenance_map: {
                readonly [key: string]: string;
            };
            /** Reason */
            readonly reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            readonly request: components["schemas"]["AnalysisRequest"];
            /** Request Hash */
            readonly request_hash: string;
            /** Result Id */
            readonly result_id: string;
            /**
             * Scale Type
             * @enum {string}
             */
            readonly scale_type: "interval" | "ratio" | "index";
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly seasonality: components["schemas"]["Seasonality"] | null;
            /** Seasonality Reason */
            readonly seasonality_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Series Refs */
            readonly series_refs: readonly components["schemas"]["SeriesRef"][];
            /**
             * Status
             * @constant
             */
            readonly status: "completed";
            /** Warnings */
            readonly warnings: readonly string[];
        };
        /** AnnualFrame */
        readonly AnnualFrame: {
            readonly anomaly: components["schemas"]["LayerArray"];
            /** Year */
            readonly year: string;
        };
        /**
         * ArtifactMembership
         * @description Complete global family membership is retained in checksummed artifacts.
         */
        readonly ArtifactMembership: {
            readonly exclusions: components["schemas"]["ArtifactRef"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "artifact";
            readonly members: components["schemas"]["ArtifactRef"];
        };
        /** ArtifactRef */
        readonly ArtifactRef: {
            /** Artifact Id */
            readonly artifact_id: string;
            /** Bytes */
            readonly bytes: number;
            /** Media Type */
            readonly media_type: string;
            /** Path */
            readonly path: string;
            /** Sha256 */
            readonly sha256: string;
        };
        /** AvailableEstimate */
        readonly AvailableEstimate: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Ci High */
            readonly ci_high: number | null;
            /** Ci Low */
            readonly ci_low: number | null;
            /** Ci Method */
            readonly ci_method: string | null;
            /** Ci Method Version */
            readonly ci_method_version: string | null;
            /** Ci Reason */
            readonly ci_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Confidence Level */
            readonly confidence_level: number | null;
            /**
             * Estimator
             * @enum {string}
             */
            readonly estimator: "sen" | "ols" | "derived";
            /** Estimator Version */
            readonly estimator_version: string;
            /** Provenance Id */
            readonly provenance_id: string;
            /**
             * Quantity
             * @enum {string}
             */
            readonly quantity: "slope_per_decade" | "percent_change_per_decade" | "standardized_slope_per_decade" | "mean" | "residual_sd" | "ols_standard_error" | "detectability_horizon_years" | "emergence_year";
            /** Reason */
            readonly reason: null;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "available";
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Value */
            readonly value: number;
        };
        /** AvailableForecast */
        readonly AvailableForecast: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /**
             * Horizon Months
             * @enum {integer}
             */
            readonly horizon_months: 12 | 24;
            /**
             * Label
             * @constant
             */
            readonly label: "Statistical forecast";
            /**
             * Model
             * @constant
             */
            readonly model: "trend_seasonality_ar1";
            /** Model Version */
            readonly model_version: string;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Quantiles */
            readonly quantiles: readonly components["schemas"]["Quantiles"][];
            /** Reason */
            readonly reason: null;
            /** Seed */
            readonly seed: number;
            readonly skill: components["schemas"]["SkillMetrics"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "available";
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Validation Report Id */
            readonly validation_report_id: string;
        };
        /** AvailableGrade */
        readonly AvailableGrade: {
            /** Provenance Id */
            readonly provenance_id: string;
            /** Reasons */
            readonly reasons: readonly string[];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "available";
            /**
             * Value
             * @enum {string}
             */
            readonly value: "A" | "B" | "C" | "D";
        };
        /** AvailableProjection */
        readonly AvailableProjection: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Horizon Months */
            readonly horizon_months: number;
            /**
             * Label
             * @constant
             */
            readonly label: "Not a prediction";
            /**
             * Model
             * @constant
             */
            readonly model: "trend_seasonality_ar1";
            /** Model Version */
            readonly model_version: string;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Quantiles */
            readonly quantiles: readonly components["schemas"]["Quantiles"][];
            /** Reason */
            readonly reason: null;
            /** Seed */
            readonly seed: number;
            /**
             * Simulation Paths
             * @constant
             */
            readonly simulation_paths: 2000;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "available";
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Validation Report Id */
            readonly validation_report_id: string;
        };
        /** AvailableTest */
        readonly AvailableTest: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Df Denominator */
            readonly df_denominator: number | null;
            /** Df Numerator */
            readonly df_numerator: number | null;
            /** Effective N */
            readonly effective_n: number | null;
            readonly lags: components["schemas"]["LagParameters"] | null;
            readonly method: components["schemas"]["Method"];
            /** P */
            readonly p: number;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Reason */
            readonly reason: null;
            /**
             * Role
             * @enum {string}
             */
            readonly role: "primary" | "secondary" | "reference" | "seasonal";
            /** Statistic */
            readonly statistic: number;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "available";
            /** Valid N */
            readonly valid_n: number;
        };
        /** BboxRegion */
        readonly BboxRegion: {
            /** Bbox */
            readonly bbox: readonly [
                number,
                number,
                number,
                number
            ];
            /**
             * Dateline
             * @default not_crossing
             * @enum {string}
             */
            readonly dateline?: "not_crossing" | "crossing";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "bbox";
        };
        /** CancelledJob */
        readonly CancelledJob: {
            /** Attempt */
            readonly attempt: number;
            /**
             * Cancellation Scope
             * @enum {string}
             */
            readonly cancellation_scope: "local_polling_only" | "local_and_remote";
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Job Id */
            readonly job_id: string;
            /** Provider Job Ids */
            readonly provider_job_ids: readonly string[];
            /**
             * Remote Work
             * @enum {string}
             */
            readonly remote_work: "may_continue" | "cancelled" | "not_submitted";
            /** Request Hash */
            readonly request_hash: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Stage */
            readonly stage: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly state: "cancelled";
            /** Status Url */
            readonly status_url: string;
            /**
             * Updated At
             * Format: date-time
             */
            readonly updated_at: string;
        };
        /** Capabilities */
        readonly Capabilities: {
            /** Analysis Ready */
            readonly analysis_ready: boolean;
            /** Arbitrary Regions */
            readonly arbitrary_regions: boolean;
            /** Available Products */
            readonly available_products: readonly components["schemas"]["ProductCapability"][];
            /** Build Id */
            readonly build_id: string;
            /** Data Release Id */
            readonly data_release_id: string | null;
            /** Enabled Operations */
            readonly enabled_operations: readonly ("analyse" | "scan" | "compare" | "outlook" | "acquire" | "export" | "read_prepared")[];
            /** Limitations */
            readonly limitations: readonly ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown")[];
            /**
             * Mode
             * @enum {string}
             */
            readonly mode: "local" | "snapshot";
            /** Prepared Cases */
            readonly prepared_cases: readonly components["schemas"]["PreparedCase"][];
            readonly readiness: components["schemas"]["Readiness"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Supported Schema Versions */
            readonly supported_schema_versions: readonly "1.0"[];
        };
        /** CellRegion */
        readonly CellRegion: {
            /** Cell Id */
            readonly cell_id: number;
            /** Grid Id */
            readonly grid_id: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "cell";
            /** Layer Id */
            readonly layer_id: string;
        };
        /** ComparedResult */
        readonly ComparedResult: {
            /** Binding Id */
            readonly binding_id: string;
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Result Id */
            readonly result_id: string;
            readonly slope: components["schemas"]["Estimate"];
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** ComparisonRequest */
        readonly ComparisonRequest: {
            /** Alpha */
            readonly alpha: number;
            /** Baseline */
            readonly baseline: components["schemas"]["WindowBaseline"] | components["schemas"]["ExplicitBaseline"];
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Method Profile
             * @constant
             */
            readonly method_profile: "srs-p0-v1";
            /** Regions */
            readonly regions: readonly [
                components["schemas"]["RegionSpec"],
                components["schemas"]["RegionSpec"]
            ];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** ComparisonResult */
        readonly ComparisonResult: {
            readonly bootstrap: components["schemas"]["PairedBootstrap"];
            /** Common Support */
            readonly common_support: readonly string[];
            readonly common_window: components["schemas"]["MonthlyWindow"];
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Data Release Id */
            readonly data_release_id: string;
            readonly difference: components["schemas"]["Estimate"];
            /**
             * Evidence Kind
             * @enum {string}
             */
            readonly evidence_kind: "scientific" | "synthetic_contract";
            readonly left: components["schemas"]["ComparedResult"];
            /**
             * Mode
             * @enum {string}
             */
            readonly mode: "local" | "snapshot";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Provenance Map */
            readonly provenance_map: {
                readonly [key: string]: string;
            };
            readonly request: components["schemas"]["ComparisonRequest"];
            /** Request Hash */
            readonly request_hash: string;
            /** Result Id */
            readonly result_id: string;
            readonly right: components["schemas"]["ComparedResult"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Status
             * @constant
             */
            readonly status: "completed";
            /** Warnings */
            readonly warnings: readonly string[];
        };
        /** DatasetBinding */
        readonly DatasetBinding: {
            /** Analysis Grid Id */
            readonly analysis_grid_id: string;
            /** Binding Id */
            readonly binding_id: string;
            /** Caveat Ids */
            readonly caveat_ids: readonly string[];
            /** Concept Id */
            readonly concept_id: string | null;
            readonly coverage: components["schemas"]["MonthlyWindow"];
            /**
             * Data Kind
             * @enum {string}
             */
            readonly data_kind: "observations" | "model" | "synthetic_contract";
            /** Doi */
            readonly doi: string | null;
            /**
             * Domain
             * @enum {string}
             */
            readonly domain: "land" | "ocean" | "global";
            /** Evidence Refs */
            readonly evidence_refs: readonly string[];
            /** Field */
            readonly field: string;
            /** Native Grid Id */
            readonly native_grid_id: string;
            /** Native Units */
            readonly native_units: string | null;
            /** Product */
            readonly product: string;
            /** Product Version */
            readonly product_version: string;
            /**
             * Provider
             * @enum {string}
             */
            readonly provider: "power" | "earthdata" | "giovanni" | "appeears" | "obdaac" | "synthetic_contract";
            /** Resource */
            readonly resource: string;
            /**
             * Scale Type
             * @enum {string}
             */
            readonly scale_type: "interval" | "ratio" | "index";
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Source Calendar */
            readonly source_calendar: string;
            /**
             * Time Convention
             * @enum {string}
             */
            readonly time_convention: "UTC" | "LST" | "source_native";
            readonly transform: components["schemas"]["Transform"];
            /**
             * Unit Evidence
             * @enum {string}
             */
            readonly unit_evidence: "header_required" | "header_verified" | "synthetic_contract";
            /**
             * Units
             * @enum {string}
             */
            readonly units: "°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** Detectability */
        readonly Detectability: {
            /** Detection Probability */
            readonly detection_probability: number;
            /** Emergence */
            readonly emergence: readonly components["schemas"]["Emergence"][];
            /** First Valid Month */
            readonly first_valid_month: string | null;
            readonly horizon: components["schemas"]["Estimate"];
            /**
             * Label
             * @constant
             */
            readonly label: "if the trend continues";
            /** Noise Units */
            readonly noise_units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Significance Alpha */
            readonly significance_alpha: number;
            readonly years_still_needed: components["schemas"]["Estimate"];
        };
        /** Emergence */
        readonly Emergence: {
            readonly estimate: components["schemas"]["Estimate"];
            /**
             * K
             * @enum {integer}
             */
            readonly k: 1 | 2;
        };
        /**
         * Error
         * @description Wire shape for application/problem+json; no HTTP handler is installed by F03.
         */
        readonly Error: {
            /**
             * Code
             * @enum {string}
             */
            readonly code: "MALFORMED_JSON" | "INVALID_PARAMETERS" | "INVALID_GEOMETRY" | "NOT_FOUND" | "MODE_UNAVAILABLE" | "OUTSIDE_PRODUCT_DOMAIN" | "INSUFFICIENT_COVERAGE" | "UNKNOWN_UNITS" | "AUTH_REQUIRED" | "PROVIDER_QUOTA" | "PROVIDER_TIMEOUT" | "PROVIDER_RESPONSE_INVALID" | "PROVIDER_UNAVAILABLE" | "ARTIFACT_INTEGRITY" | "SNAPSHOT_NOT_BUNDLED" | "METHOD_VALIDATION_REQUIRED";
            /** Detail */
            readonly detail: string;
            /** Field Errors */
            readonly field_errors: readonly components["schemas"]["FieldError"][];
            /** Request Id */
            readonly request_id: string;
            /** Retry After Seconds */
            readonly retry_after_seconds: number | null;
            /** Retryable */
            readonly retryable: boolean;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Status
             * @enum {integer}
             */
            readonly status: 400 | 401 | 404 | 409 | 422 | 429 | 500 | 502 | 503;
            /** Title */
            readonly title: string;
            /** Type */
            readonly type: string;
        };
        /** Estimate */
        readonly Estimate: components["schemas"]["AvailableEstimate"] | components["schemas"]["UnavailableEstimate"];
        /** ExcludedRow */
        readonly ExcludedRow: {
            readonly actual_window: components["schemas"]["MonthlyWindow"] | null;
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            /** Result Id */
            readonly result_id: null;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "excluded";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** Exclusion */
        readonly Exclusion: {
            /** Member Id */
            readonly member_id: string;
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
        };
        /** ExplicitBaseline */
        readonly ExplicitBaseline: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "explicit";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** FailedJob */
        readonly FailedJob: {
            /** Attempt */
            readonly attempt: number;
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            readonly error: components["schemas"]["Error"];
            /** Job Id */
            readonly job_id: string;
            /** Provider Job Ids */
            readonly provider_job_ids: readonly string[];
            /** Request Hash */
            readonly request_hash: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Stage */
            readonly stage: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly state: "failed";
            /** Status Url */
            readonly status_url: string;
            /**
             * Updated At
             * Format: date-time
             */
            readonly updated_at: string;
        };
        /** FdrContext */
        readonly FdrContext: {
            /** Baseline */
            readonly baseline: components["schemas"]["WindowBaseline"] | components["schemas"]["ExplicitBaseline"];
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Method Profile
             * @constant
             */
            readonly method_profile: "srs-p0-v1";
            /** Region Hash */
            readonly region_hash: string;
            readonly window: components["schemas"]["MonthlyWindow"];
            /**
             * Window Policy
             * @default shared_intersection
             * @enum {string}
             */
            readonly window_policy?: "shared_intersection" | "per_variable_defaults";
        };
        /** FdrMember */
        readonly FdrMember: {
            readonly actual_window: components["schemas"]["MonthlyWindow"];
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Member Id */
            readonly member_id: string;
            /** P */
            readonly p: number;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Q */
            readonly q: number;
        };
        /** FdrResult */
        readonly FdrResult: {
            readonly context: components["schemas"]["FdrContext"];
            /** Family Id */
            readonly family_id: string;
            /**
             * Family Kind
             * @enum {string}
             */
            readonly family_kind: "regional_scan" | "seasonal_fingerprint" | "global_layer";
            /** Membership */
            readonly membership: components["schemas"]["InlineMembership"] | components["schemas"]["ArtifactMembership"];
            /** Size */
            readonly size: number;
        };
        /** FieldBox */
        readonly FieldBox: {
            /** Cell Lat Step */
            readonly cell_lat_step: number;
            /** Cell Lon Step */
            readonly cell_lon_step: number;
            /** Lat Max */
            readonly lat_max: number;
            /** Lat Min */
            readonly lat_min: number;
            /** Lon Max */
            readonly lon_max: number;
            /** Lon Min */
            readonly lon_min: number;
            /**
             * Selection
             * @constant
             */
            readonly selection: "native_cells_in_box";
        };
        /** FieldError */
        readonly FieldError: {
            /** Code */
            readonly code: string;
            /** Location */
            readonly location: readonly (string | number)[];
            /** Message */
            readonly message: string;
        };
        /**
         * FieldResult
         * @description One month's raw native-cell field in a box. No aggregation, trend or analysis.
         */
        readonly FieldResult: {
            readonly box: components["schemas"]["FieldBox"];
            /** Cell Lats */
            readonly cell_lats: readonly number[];
            /** Cell Lons */
            readonly cell_lons: readonly number[];
            /** Month */
            readonly month: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly source: components["schemas"]["FieldSource"];
            /** Values */
            readonly values: readonly (number | null)[];
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** FieldSource */
        readonly FieldSource: {
            /** Acknowledgement */
            readonly acknowledgement: string;
            /** Artifact Sha256 */
            readonly artifact_sha256: {
                readonly [key: string]: string;
            };
            /** Caveats */
            readonly caveats: readonly string[];
            /**
             * Data Kind
             * @constant
             */
            readonly data_kind: "model";
            /** Field */
            readonly field: string;
            /**
             * Retrieved At
             * Format: date-time
             */
            readonly retrieved_at: string;
            /**
             * Scientifically Validated
             * @constant
             */
            readonly scientifically_validated: false;
            /** Served From Cache */
            readonly served_from_cache: boolean;
            /** Source Units */
            readonly source_units: string;
            /** Stale Cache */
            readonly stale_cache: boolean;
            /** Store Title */
            readonly store_title: string;
            /** Store Version */
            readonly store_version: string;
            /**
             * Time Standard
             * @enum {string}
             */
            readonly time_standard: "UTC" | "LST";
            /**
             * Units
             * @enum {string}
             */
            readonly units: "°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** GeocodeCandidate */
        readonly GeocodeCandidate: {
            /** Admin1 */
            readonly admin1: string | null;
            /** Country */
            readonly country: string | null;
            /** Lat */
            readonly lat: number;
            /** Lon */
            readonly lon: number;
            /** Name */
            readonly name: string;
        };
        /** GeocodeResult */
        readonly GeocodeResult: {
            /** Candidates */
            readonly candidates: readonly components["schemas"]["GeocodeCandidate"][];
            /** Query */
            readonly query: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly source: components["schemas"]["GeocodeSource"];
        };
        /** GeocodeSource */
        readonly GeocodeSource: {
            /** Acknowledgement */
            readonly acknowledgement: string;
            /** Artifact Sha256 */
            readonly artifact_sha256: {
                readonly [key: string]: string;
            };
            /** Caveats */
            readonly caveats: readonly string[];
            /**
             * Provider
             * @constant
             */
            readonly provider: "open-meteo-geocoding";
            /**
             * Retrieved At
             * Format: date-time
             */
            readonly retrieved_at: string;
            /**
             * Scientifically Validated
             * @constant
             */
            readonly scientifically_validated: false;
            /** Served From Cache */
            readonly served_from_cache: boolean;
            /** Stale Cache */
            readonly stale_cache: boolean;
        };
        /** GlobalRegion */
        readonly GlobalRegion: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "global";
        };
        /** Grade */
        readonly Grade: components["schemas"]["AvailableGrade"] | components["schemas"]["UnavailableGrade"];
        /**
         * HealthResponse
         * @description Liveness only: an available server does not imply available science.
         */
        readonly HealthResponse: {
            /**
             * Analysis Ready
             * @default false
             * @constant
             */
            readonly analysis_ready?: false;
            /**
             * Mode
             * @default local
             * @constant
             */
            readonly mode?: "local";
            /**
             * Schema Version
             * @default health.v1
             * @constant
             */
            readonly schema_version?: "health.v1";
            /**
             * Status
             * @default ok
             * @constant
             */
            readonly status?: "ok";
        };
        /** HTTPValidationError */
        readonly HTTPValidationError: {
            /** Detail */
            readonly detail?: readonly components["schemas"]["ValidationError"][];
        };
        /** InlineMembership */
        readonly InlineMembership: {
            /** Exclusions */
            readonly exclusions: readonly components["schemas"]["Exclusion"][];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "inline";
            /** Members */
            readonly members: readonly components["schemas"]["FdrMember"][];
        };
        /** Job */
        readonly Job: components["schemas"]["ActiveJob"] | components["schemas"]["SucceededJob"] | components["schemas"]["FailedJob"] | components["schemas"]["CancelledJob"];
        /**
         * JobAccepted
         * @description Future transport: HTTP 202 and Location=status_url; no result payload yet.
         */
        readonly JobAccepted: {
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Job Id */
            readonly job_id: string;
            /** Request Hash */
            readonly request_hash: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * State
             * @enum {string}
             */
            readonly state: "queued" | "running" | "waiting_provider";
            /** Status Url */
            readonly status_url: string;
        };
        /** LagParameters */
        readonly LagParameters: {
            /** Diagnostic Alpha */
            readonly diagnostic_alpha: number;
            /**
             * Gap Policy
             * @constant
             */
            readonly gap_policy: "calendar_positions";
            /** Included Lags */
            readonly included_lags: readonly number[];
            /** Max Lag */
            readonly max_lag: number;
            /**
             * Spacing
             * @enum {string}
             */
            readonly spacing: "calendar_months" | "calendar_years";
        };
        /** LayerArray */
        readonly LayerArray: {
            readonly artifact: components["schemas"]["ArtifactRef"];
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /**
             * Byte Order
             * @constant
             */
            readonly byte_order: "little";
            /** Count */
            readonly count: number;
            /**
             * Dtype
             * @enum {string}
             */
            readonly dtype: "float32" | "int16" | "uint16" | "uint8";
            readonly missing_mask: components["schemas"]["ArtifactRef"];
            /**
             * Missing Mask Encoding
             * @constant
             */
            readonly missing_mask_encoding: "uint8_0_valid_1_missing";
            /** Offset */
            readonly offset: number;
            /** Scale */
            readonly scale: number;
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /**
             * Value Transform
             * @enum {string}
             */
            readonly value_transform: "raw" | "anomaly" | "log10_anomaly";
        };
        /** LayerGrid */
        readonly LayerGrid: {
            /**
             * Cell Id Formula
             * @constant
             */
            readonly cell_id_formula: "row * n_lon + column";
            /**
             * Cell Order
             * @constant
             */
            readonly cell_order: "row_major";
            /** Grid Id */
            readonly grid_id: string;
            /**
             * Latitude Order
             * @enum {string}
             */
            readonly latitude_order: "north_to_south" | "south_to_north";
            /** Longitude Origin */
            readonly longitude_origin: number;
            /**
             * Longitude Wrap
             * @constant
             */
            readonly longitude_wrap: true;
            /** N Lat */
            readonly n_lat: number;
            /** N Lon */
            readonly n_lon: number;
        };
        /** LayerManifest */
        readonly LayerManifest: {
            /**
             * Alpha Independent P Q
             * @constant
             */
            readonly alpha_independent_p_q: true;
            /** Attribution */
            readonly attribution: readonly string[];
            /** Baseline */
            readonly baseline: components["schemas"]["WindowBaseline"] | components["schemas"]["ExplicitBaseline"];
            /** Binding Ids */
            readonly binding_ids: readonly string[];
            /** Caveat Ids */
            readonly caveat_ids: readonly string[];
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Data Release Id */
            readonly data_release_id: string;
            /** Dataset Identifiers */
            readonly dataset_identifiers: readonly string[];
            readonly fdr: components["schemas"]["FdrResult"];
            /** Flag Meanings */
            readonly flag_meanings: {
                readonly [key: string]: string;
            };
            /** Frames */
            readonly frames: readonly components["schemas"]["AnnualFrame"][];
            readonly grid: components["schemas"]["LayerGrid"];
            /** Layer Id */
            readonly layer_id: string;
            readonly method_flags: components["schemas"]["LayerArray"];
            /**
             * Method Profile
             * @constant
             */
            readonly method_profile: "srs-p0-v1";
            /** Method Versions */
            readonly method_versions: {
                readonly [key: string]: string;
            };
            readonly p: components["schemas"]["LayerArray"];
            /** Provenance Id */
            readonly provenance_id: string;
            readonly q: components["schemas"]["LayerArray"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly slope: components["schemas"]["LayerArray"];
            readonly standardized_slope: components["schemas"]["LayerArray"];
            readonly valid_counts: components["schemas"]["LayerArray"];
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** Method */
        readonly Method: {
            /**
             * Name
             * @enum {string}
             */
            readonly name: "hamed_rao_mk" | "ols_ar1_effective_n" | "reference_ols_f" | "ordinary_mk" | "seasonal_kendall";
            /** Validation Report Id */
            readonly validation_report_id: string | null;
            /**
             * Validation Status
             * @enum {string}
             */
            readonly validation_status: "pending" | "validated" | "failed" | "synthetic_contract";
            /** Version */
            readonly version: string;
        };
        /**
         * MonthlyWindow
         * @description Inclusive complete calendar months, bounded by the TDD's 600-position limit.
         */
        readonly MonthlyWindow: {
            /** End */
            readonly end: string;
            /** Start */
            readonly start: string;
        };
        /** MultiPolygonGeometry */
        readonly MultiPolygonGeometry: {
            /** Coordinates */
            readonly coordinates: readonly (readonly (readonly (readonly [
                number,
                number
            ])[])[])[];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly type: "MultiPolygon";
        };
        /** OutlookRequest */
        readonly OutlookRequest: {
            /** Analysis Result Id */
            readonly analysis_result_id: string;
            /**
             * Forecast Horizon Months
             * @enum {integer}
             */
            readonly forecast_horizon_months: 12 | 24;
            /** Projection Horizon Years */
            readonly projection_horizon_years: number;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
        };
        /** OutlookResult */
        readonly OutlookResult: {
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Evidence Kind
             * @enum {string}
             */
            readonly evidence_kind: "scientific" | "synthetic_contract";
            /** Forecast */
            readonly forecast: components["schemas"]["AvailableForecast"] | components["schemas"]["UnavailableForecast"];
            readonly historical_window: components["schemas"]["MonthlyWindow"];
            /**
             * Mode
             * @enum {string}
             */
            readonly mode: "local" | "snapshot";
            /** Projection */
            readonly projection: components["schemas"]["AvailableProjection"] | components["schemas"]["UnavailableProjection"];
            /** Provenance Id */
            readonly provenance_id: string;
            /** Provenance Map */
            readonly provenance_map: {
                readonly [key: string]: string;
            };
            /** Record Length Years */
            readonly record_length_years: number;
            readonly request: components["schemas"]["OutlookRequest"];
            /** Request Hash */
            readonly request_hash: string;
            /** Result Id */
            readonly result_id: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Status
             * @constant
             */
            readonly status: "completed";
            /** Warnings */
            readonly warnings: readonly string[];
        };
        /** PairedBootstrap */
        readonly PairedBootstrap: {
            /** Block Months */
            readonly block_months: number;
            /** Draws */
            readonly draws: number;
            /**
             * Method
             * @constant
             */
            readonly method: "paired_moving_block_residual_bootstrap";
            /** Method Version */
            readonly method_version: string;
            /** Seed */
            readonly seed: number;
            /** Validation Report Id */
            readonly validation_report_id: string | null;
        };
        /** PointLocation */
        readonly PointLocation: {
            /** Cell Lat */
            readonly cell_lat: number;
            /** Cell Lat Step */
            readonly cell_lat_step: number;
            /** Cell Lon */
            readonly cell_lon: number;
            /** Cell Lon Step */
            readonly cell_lon_step: number;
            /** Requested Lat */
            readonly requested_lat: number;
            /** Requested Lon */
            readonly requested_lon: number;
            /**
             * Selection
             * @constant
             */
            readonly selection: "nearest_native_cell";
        };
        /** PointSeriesResult */
        readonly PointSeriesResult: {
            readonly location: components["schemas"]["PointLocation"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly series: components["schemas"]["Series"];
            readonly source: components["schemas"]["SeriesSource"];
        };
        /** PolygonGeometry */
        readonly PolygonGeometry: {
            /** Coordinates */
            readonly coordinates: readonly (readonly (readonly [
                number,
                number
            ])[])[];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly type: "Polygon";
        };
        /**
         * PolygonRegion
         * @description Dateline-crossing rings must arrive split; no implicit complement selection.
         */
        readonly PolygonRegion: {
            /**
             * Dateline
             * @enum {string}
             */
            readonly dateline: "not_crossing" | "split";
            /** Geometry */
            readonly geometry: components["schemas"]["PolygonGeometry"] | components["schemas"]["MultiPolygonGeometry"];
            /**
             * Interior
             * @enum {string}
             */
            readonly interior: "bounded" | "complement";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "polygon";
        };
        /** PreparedCase */
        readonly PreparedCase: {
            /** Request Hash */
            readonly request_hash: string;
            /** Result Id */
            readonly result_id: string;
        };
        /** PresetRegion */
        readonly PresetRegion: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "preset";
            /** Preset Id */
            readonly preset_id: string;
            /** Version */
            readonly version: string;
        };
        /** ProductCapability */
        readonly ProductCapability: {
            /** Binding Id */
            readonly binding_id: string;
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** Provenance */
        readonly Provenance: {
            /** Binding Ids */
            readonly binding_ids: readonly string[];
            /** Code Version */
            readonly code_version: string;
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /**
             * Data Kind
             * @enum {string}
             */
            readonly data_kind: "scientific" | "synthetic_contract";
            /** Granule Or Job Ids */
            readonly granule_or_job_ids: readonly string[];
            /** Mask Id */
            readonly mask_id: string | null;
            /** Parent Ids */
            readonly parent_ids: readonly string[];
            /** Processing Steps */
            readonly processing_steps: readonly string[];
            /** Provenance Id */
            readonly provenance_id: string;
            /** Qa Policy Id */
            readonly qa_policy_id: string;
            /** Random Seed */
            readonly random_seed: number | null;
            /** Request Hash */
            readonly request_hash: string;
            /** Result Hash */
            readonly result_hash: string;
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Software Versions */
            readonly software_versions: {
                readonly [key: string]: string;
            };
            /** Source Artifact Hashes */
            readonly source_artifact_hashes: readonly string[];
        };
        /** Quantiles */
        readonly Quantiles: {
            /** Lower80 */
            readonly lower80: number;
            /** Lower95 */
            readonly lower95: number;
            /** Median */
            readonly median: number;
            /** Time */
            readonly time: string;
            /** Upper80 */
            readonly upper80: number;
            /** Upper95 */
            readonly upper95: number;
        };
        /** Readiness */
        readonly Readiness: {
            /** Cube Readable */
            readonly cube_readable: boolean;
            /** Release Hashes Verified */
            readonly release_hashes_verified: boolean;
            /** Schema Compatible */
            readonly schema_compatible: boolean;
            /** Sufficient Disk */
            readonly sufficient_disk: boolean;
        };
        /**
         * RegionalSeriesResult
         * @description Cos(latitude)-weighted monthly mean of a box's native cells. Retrieval, not analysis.
         */
        readonly RegionalSeriesResult: {
            readonly box: components["schemas"]["RegionBox"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            readonly series: components["schemas"]["Series"];
            readonly source: components["schemas"]["SeriesSource"];
        };
        /** RegionBox */
        readonly RegionBox: {
            /** Cell Lat Step */
            readonly cell_lat_step: number;
            /** Cell Lon Step */
            readonly cell_lon_step: number;
            /** Lat Max */
            readonly lat_max: number;
            /** Lat Min */
            readonly lat_min: number;
            /** Lon Max */
            readonly lon_max: number;
            /** Lon Min */
            readonly lon_min: number;
            /** Native Cells */
            readonly native_cells: number;
            /**
             * Selection
             * @constant
             */
            readonly selection: "area_weighted_mean_native_cells";
        };
        /**
         * RegionSpec
         * @description A region specification, not proof of valid topology or scientific support.
         */
        readonly RegionSpec: components["schemas"]["GlobalRegion"] | components["schemas"]["CellRegion"] | components["schemas"]["BboxRegion"] | components["schemas"]["PolygonRegion"] | components["schemas"]["PresetRegion"];
        /** RegionSummary */
        readonly RegionSummary: {
            /** Area Km2 */
            readonly area_km2: number;
            /** Cell Count */
            readonly cell_count: number;
            /** Coverage */
            readonly coverage: readonly components["schemas"]["VariableCoverage"][];
            /** Fractions Reason */
            readonly fractions_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Land Fraction */
            readonly land_fraction: number | null;
            /** Ocean Fraction */
            readonly ocean_fraction: number | null;
            /** Opposite Trends Warning */
            readonly opposite_trends_warning: boolean;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Region Hash */
            readonly region_hash: string;
        };
        /** RegressionDiagnostics */
        readonly RegressionDiagnostics: {
            /** Adjusted Standard Error */
            readonly adjusted_standard_error: number | null;
            /** Effective N */
            readonly effective_n: number | null;
            /** Provenance Id */
            readonly provenance_id: string;
            /** R Squared */
            readonly r_squared: number | null;
            /** Raw Standard Error */
            readonly raw_standard_error: number | null;
            /** Reason */
            readonly reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
        };
        /** ScanRequest */
        readonly ScanRequest: {
            /** Alpha */
            readonly alpha: number;
            /** Baseline */
            readonly baseline: components["schemas"]["WindowBaseline"] | components["schemas"]["ExplicitBaseline"];
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Method Profile
             * @constant
             */
            readonly method_profile: "srs-p0-v1";
            readonly region: components["schemas"]["RegionSpec"];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Variable Ids */
            readonly variable_ids: readonly ("V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13")[];
            readonly window: components["schemas"]["MonthlyWindow"];
            /**
             * Window Policy
             * @default shared_intersection
             * @enum {string}
             */
            readonly window_policy?: "shared_intersection" | "per_variable_defaults";
        };
        /** ScanResult */
        readonly ScanResult: {
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Data Release Id */
            readonly data_release_id: string;
            /**
             * Evidence Kind
             * @enum {string}
             */
            readonly evidence_kind: "scientific" | "synthetic_contract";
            readonly fdr: components["schemas"]["FdrResult"] | null;
            /** Fdr Reason */
            readonly fdr_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /**
             * Mode
             * @enum {string}
             */
            readonly mode: "local" | "snapshot";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Provenance Map */
            readonly provenance_map: {
                readonly [key: string]: string;
            };
            readonly region_summary: components["schemas"]["RegionSummary"];
            readonly request: components["schemas"]["ScanRequest"];
            /** Request Hash */
            readonly request_hash: string;
            /** Result Id */
            readonly result_id: string;
            /** Rows */
            readonly rows: readonly (components["schemas"]["AnalysedRow"] | components["schemas"]["ExcludedRow"])[];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /**
             * Sorting Policy
             * @constant
             */
            readonly sorting_policy: "absolute_standardized_slope_desc";
            /**
             * Status
             * @constant
             */
            readonly status: "completed";
            /** Warnings */
            readonly warnings: readonly string[];
        };
        /** Seasonality */
        readonly Seasonality: {
            readonly fdr: components["schemas"]["FdrResult"] | null;
            /** Fdr Reason */
            readonly fdr_reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Months */
            readonly months: readonly components["schemas"]["SeasonalMonth"][];
            readonly seasonal_kendall: components["schemas"]["TestResult"];
        };
        /** SeasonalMonth */
        readonly SeasonalMonth: {
            /** Month */
            readonly month: number;
            readonly slope: components["schemas"]["Estimate"];
            readonly test: components["schemas"]["TestResult"];
        };
        /** Series */
        readonly Series: {
            /** Binding Id */
            readonly binding_id: string;
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Coverage */
            readonly coverage: readonly (number | null)[];
            /**
             * Frequency
             * @enum {string}
             */
            readonly frequency: "monthly" | "annual";
            /** Grid Id */
            readonly grid_id: string;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Reason */
            readonly reason: readonly (("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null)[];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Series Id */
            readonly series_id: string;
            /** Time */
            readonly time: readonly (string)[];
            readonly transform: components["schemas"]["Transform"];
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Valid */
            readonly valid: readonly boolean[];
            /** Value */
            readonly value: readonly (number | null)[];
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** SeriesRef */
        readonly SeriesRef: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Series Id */
            readonly series_id: string;
        };
        /** SeriesSource */
        readonly SeriesSource: {
            /** Acknowledgement */
            readonly acknowledgement: string;
            /** Artifact Sha256 */
            readonly artifact_sha256: {
                readonly [key: string]: string;
            };
            /** Caveats */
            readonly caveats: readonly string[];
            /**
             * Data Kind
             * @constant
             */
            readonly data_kind: "model";
            /** Declared End */
            readonly declared_end: string;
            /** Field */
            readonly field: string;
            /** First Month */
            readonly first_month: string;
            /** Last Finite Month */
            readonly last_finite_month: string;
            /** Missing Months */
            readonly missing_months: number;
            /**
             * Retrieved At
             * Format: date-time
             */
            readonly retrieved_at: string;
            /**
             * Scientifically Validated
             * @constant
             */
            readonly scientifically_validated: false;
            /** Served From Cache */
            readonly served_from_cache: boolean;
            /** Source Units */
            readonly source_units: string;
            /** Stale Cache */
            readonly stale_cache: boolean;
            /** Store Title */
            readonly store_title: string;
            /** Store Version */
            readonly store_version: string;
            /**
             * Time Standard
             * @enum {string}
             */
            readonly time_standard: "UTC" | "LST";
            /**
             * Units
             * @enum {string}
             */
            readonly units: "°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²";
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** SkillMetrics */
        readonly SkillMetrics: {
            /** Candidate Mae */
            readonly candidate_mae: number | null;
            /** Climatology Mae */
            readonly climatology_mae: number | null;
            /** Coverage80 */
            readonly coverage80: number | null;
            /** Coverage95 */
            readonly coverage95: number | null;
            /**
             * Decision
             * @enum {string}
             */
            readonly decision: "passed" | "failed" | "unavailable";
            /** Mase */
            readonly mase: number | null;
            /** Origins */
            readonly origins: number;
            /** Provenance Id */
            readonly provenance_id: string;
            /** Reason */
            readonly reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /** Seasonal Naive Mae */
            readonly seasonal_naive_mae: number | null;
            /** Targets */
            readonly targets: number;
            readonly window: components["schemas"]["MonthlyWindow"];
        };
        /** SucceededJob */
        readonly SucceededJob: {
            /** Artifact Ids */
            readonly artifact_ids: readonly string[];
            /** Attempt */
            readonly attempt: number;
            /**
             * Created At
             * Format: date-time
             */
            readonly created_at: string;
            /** Job Id */
            readonly job_id: string;
            /** Provider Job Ids */
            readonly provider_job_ids: readonly string[];
            /** Request Hash */
            readonly request_hash: string;
            /** Result Ids */
            readonly result_ids: readonly string[];
            /**
             * Schema Version
             * @constant
             */
            readonly schema_version: "1.0";
            /** Stage */
            readonly stage: string;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly state: "succeeded";
            /** Status Url */
            readonly status_url: string;
            /**
             * Updated At
             * Format: date-time
             */
            readonly updated_at: string;
        };
        /** TestResult */
        readonly TestResult: components["schemas"]["AvailableTest"] | components["schemas"]["UnavailableTest"];
        /** Transform */
        readonly Transform: {
            /** Input Units */
            readonly input_units: string;
            /**
             * Kind
             * @enum {string}
             */
            readonly kind: "identity" | "linear" | "log10";
            /** Offset */
            readonly offset: number;
            /** Order */
            readonly order: readonly ("decode_fill" | "qa" | "scale_units" | "weighted_regional_mean" | "log10" | "monthly_climatology" | "anomaly" | "annual_mean")[];
            /** Output Units */
            readonly output_units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Scale */
            readonly scale: number;
            /** Transform Id */
            readonly transform_id: string;
            /** Version */
            readonly version: string;
        };
        /** UnavailableEstimate */
        readonly UnavailableEstimate: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Ci High */
            readonly ci_high: null;
            /** Ci Low */
            readonly ci_low: null;
            /** Ci Method */
            readonly ci_method: null;
            /** Ci Method Version */
            readonly ci_method_version: null;
            /**
             * Ci Reason
             * @enum {string}
             */
            readonly ci_reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            /** Confidence Level */
            readonly confidence_level: null;
            /**
             * Estimator
             * @enum {string}
             */
            readonly estimator: "sen" | "ols" | "derived";
            /** Estimator Version */
            readonly estimator_version: string;
            /** Provenance Id */
            readonly provenance_id: string;
            /**
             * Quantity
             * @enum {string}
             */
            readonly quantity: "slope_per_decade" | "percent_change_per_decade" | "standardized_slope_per_decade" | "mean" | "residual_sd" | "ols_standard_error" | "detectability_horizon_years" | "emergence_year";
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "unavailable" | "unbounded";
            /** Units */
            readonly units: ("°C" | "mm/day" | "mm" | "10^15 molecules/cm²" | "dimensionless" | "mg/m³" | "W/m²") | ("log10(mg/m³)" | "°C/decade" | "mm/day/decade" | "mm/decade" | "10^15 molecules/cm²/decade" | "dimensionless/decade" | "mg/m³/decade" | "W/m²/decade" | "log10(mg/m³)/decade" | "%/decade" | "sigma/decade" | "years" | "fractional_year" | "km²");
            /** Value */
            readonly value: null;
        };
        /** UnavailableForecast */
        readonly UnavailableForecast: {
            /**
             * Label
             * @constant
             */
            readonly label: "Statistical forecast";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Quantiles */
            readonly quantiles: null;
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            readonly skill: components["schemas"]["SkillMetrics"];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "unavailable";
        };
        /** UnavailableGrade */
        readonly UnavailableGrade: {
            /** Provenance Id */
            readonly provenance_id: string;
            /** Reasons */
            readonly reasons: readonly ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown")[];
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "unavailable";
            /** Value */
            readonly value: null;
        };
        /** UnavailableProjection */
        readonly UnavailableProjection: {
            /**
             * Label
             * @constant
             */
            readonly label: "Not a prediction";
            /** Provenance Id */
            readonly provenance_id: string;
            /** Quantiles */
            readonly quantiles: null;
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "unavailable";
        };
        /** UnavailableTest */
        readonly UnavailableTest: {
            /**
             * Branch Id
             * @enum {string}
             */
            readonly branch_id: "raw_monthly" | "monthly_anomaly" | "log10_monthly_anomaly" | "reference_raw_monthly" | "reference_annual_anomaly" | "annual_layer" | "seasonal_month";
            /** Df Denominator */
            readonly df_denominator: null;
            /** Df Numerator */
            readonly df_numerator: null;
            /** Effective N */
            readonly effective_n: null;
            readonly lags: components["schemas"]["LagParameters"] | null;
            readonly method: components["schemas"]["Method"];
            /** P */
            readonly p: null;
            /** Provenance Id */
            readonly provenance_id: string;
            /**
             * Reason
             * @enum {string}
             */
            readonly reason: "missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown";
            /**
             * Role
             * @enum {string}
             */
            readonly role: "primary" | "secondary" | "reference" | "seasonal";
            /** Statistic */
            readonly statistic: null;
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly status: "unavailable";
            /** Valid N */
            readonly valid_n: number;
        };
        /** ValidationError */
        readonly ValidationError: {
            /** Context */
            readonly ctx?: Record<string, never>;
            /** Input */
            readonly input?: unknown;
            /** Location */
            readonly loc: readonly (string | number)[];
            /** Message */
            readonly msg: string;
            /** Error Type */
            readonly type: string;
        };
        /** VariableCoverage */
        readonly VariableCoverage: {
            /** Coverage */
            readonly coverage: number | null;
            /** Reason */
            readonly reason: ("missing_observation" | "insufficient_coverage" | "insufficient_record" | "outside_product_domain" | "unknown_coverage" | "unknown_units" | "invalid_variance" | "zero_or_unresolved_slope" | "zero_residual_variance" | "interval_scale_variable" | "index_variable" | "near_zero_mean" | "method_validation_required" | "method_unvalidated_for_gaps" | "insufficient_lag_pairs" | "insufficient_baseline" | "no_forecast_skill" | "insufficient_backtest_origins" | "nonstationary_residuals" | "unsupported_transform" | "snapshot_not_bundled" | "not_implemented" | "not_requested" | "no_fdr_context" | "insufficient_contiguous_blocks" | "no_eligible_tests" | "provider_progress_unknown") | null;
            /**
             * Variable Id
             * @enum {string}
             */
            readonly variable_id: "V01" | "V02" | "V03" | "V04" | "V05" | "V06" | "V07" | "V08" | "V09" | "V10" | "V11" | "V12" | "V13";
        };
        /** WindowBaseline */
        readonly WindowBaseline: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            readonly kind: "analysis_window";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    readonly monthly_field_api_v1_field__variable_id__get: {
        readonly parameters: {
            readonly query: {
                readonly lat_max: number;
                readonly lat_min: number;
                readonly lon_max: number;
                readonly lon_min: number;
                readonly month: string;
            };
            readonly header?: never;
            readonly path: {
                readonly variable_id: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful Response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["FieldResult"];
                };
            };
            /** @description Validation Error */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    readonly lookup_api_v1_geocode_get: {
        readonly parameters: {
            readonly query: {
                readonly name: string;
            };
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful Response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["GeocodeResult"];
                };
            };
            /** @description Validation Error */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    readonly health_api_v1_health_get: {
        readonly parameters: {
            readonly query?: never;
            readonly header?: never;
            readonly path?: never;
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful Response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HealthResponse"];
                };
            };
        };
    };
    readonly regional_series_api_v1_regional_series__variable_id__get: {
        readonly parameters: {
            readonly query: {
                readonly lat_max: number;
                readonly lat_min: number;
                readonly lon_max: number;
                readonly lon_min: number;
            };
            readonly header?: never;
            readonly path: {
                readonly variable_id: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful Response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["RegionalSeriesResult"];
                };
            };
            /** @description Validation Error */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    readonly point_series_api_v1_series__variable_id__get: {
        readonly parameters: {
            readonly query: {
                readonly lat: number;
                readonly lon: number;
            };
            readonly header?: never;
            readonly path: {
                readonly variable_id: string;
            };
            readonly cookie?: never;
        };
        readonly requestBody?: never;
        readonly responses: {
            /** @description Successful Response */
            readonly 200: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["PointSeriesResult"];
                };
            };
            /** @description Validation Error */
            readonly 422: {
                headers: {
                    readonly [name: string]: unknown;
                };
                content: {
                    readonly "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}

export type ActiveJob = components["schemas"]["ActiveJob"];
export type AnalysedRow = components["schemas"]["AnalysedRow"];
export type AnalysisBranch = components["schemas"]["AnalysisBranch"];
export type AnalysisRequest = components["schemas"]["AnalysisRequest"];
export type AnalysisResult = components["schemas"]["AnalysisResult"];
export type AnnualFrame = components["schemas"]["AnnualFrame"];
export type ArtifactMembership = components["schemas"]["ArtifactMembership"];
export type ArtifactRef = components["schemas"]["ArtifactRef"];
export type AvailableEstimate = components["schemas"]["AvailableEstimate"];
export type AvailableForecast = components["schemas"]["AvailableForecast"];
export type AvailableGrade = components["schemas"]["AvailableGrade"];
export type AvailableProjection = components["schemas"]["AvailableProjection"];
export type AvailableTest = components["schemas"]["AvailableTest"];
export type BboxRegion = components["schemas"]["BboxRegion"];
export type CancelledJob = components["schemas"]["CancelledJob"];
export type Capabilities = components["schemas"]["Capabilities"];
export type CellRegion = components["schemas"]["CellRegion"];
export type ComparedResult = components["schemas"]["ComparedResult"];
export type ComparisonRequest = components["schemas"]["ComparisonRequest"];
export type ComparisonResult = components["schemas"]["ComparisonResult"];
export type DatasetBinding = components["schemas"]["DatasetBinding"];
export type Detectability = components["schemas"]["Detectability"];
export type Emergence = components["schemas"]["Emergence"];
export type Error = components["schemas"]["Error"];
export type Estimate = components["schemas"]["Estimate"];
export type ExcludedRow = components["schemas"]["ExcludedRow"];
export type Exclusion = components["schemas"]["Exclusion"];
export type ExplicitBaseline = components["schemas"]["ExplicitBaseline"];
export type FailedJob = components["schemas"]["FailedJob"];
export type FdrContext = components["schemas"]["FdrContext"];
export type FdrMember = components["schemas"]["FdrMember"];
export type FdrResult = components["schemas"]["FdrResult"];
export type FieldBox = components["schemas"]["FieldBox"];
export type FieldError = components["schemas"]["FieldError"];
export type FieldResult = components["schemas"]["FieldResult"];
export type FieldSource = components["schemas"]["FieldSource"];
export type GeocodeCandidate = components["schemas"]["GeocodeCandidate"];
export type GeocodeResult = components["schemas"]["GeocodeResult"];
export type GeocodeSource = components["schemas"]["GeocodeSource"];
export type GlobalRegion = components["schemas"]["GlobalRegion"];
export type Grade = components["schemas"]["Grade"];
export type HTTPValidationError = components["schemas"]["HTTPValidationError"];
export type HealthResponse = components["schemas"]["HealthResponse"];
export type InlineMembership = components["schemas"]["InlineMembership"];
export type Job = components["schemas"]["Job"];
export type JobAccepted = components["schemas"]["JobAccepted"];
export type LagParameters = components["schemas"]["LagParameters"];
export type LayerArray = components["schemas"]["LayerArray"];
export type LayerGrid = components["schemas"]["LayerGrid"];
export type LayerManifest = components["schemas"]["LayerManifest"];
export type Method = components["schemas"]["Method"];
export type MonthlyWindow = components["schemas"]["MonthlyWindow"];
export type MultiPolygonGeometry = components["schemas"]["MultiPolygonGeometry"];
export type OutlookRequest = components["schemas"]["OutlookRequest"];
export type OutlookResult = components["schemas"]["OutlookResult"];
export type PairedBootstrap = components["schemas"]["PairedBootstrap"];
export type PointLocation = components["schemas"]["PointLocation"];
export type PointSeriesResult = components["schemas"]["PointSeriesResult"];
export type PolygonGeometry = components["schemas"]["PolygonGeometry"];
export type PolygonRegion = components["schemas"]["PolygonRegion"];
export type PreparedCase = components["schemas"]["PreparedCase"];
export type PresetRegion = components["schemas"]["PresetRegion"];
export type ProductCapability = components["schemas"]["ProductCapability"];
export type Provenance = components["schemas"]["Provenance"];
export type Quantiles = components["schemas"]["Quantiles"];
export type Readiness = components["schemas"]["Readiness"];
export type RegionBox = components["schemas"]["RegionBox"];
export type RegionSpec = components["schemas"]["RegionSpec"];
export type RegionSummary = components["schemas"]["RegionSummary"];
export type RegionalSeriesResult = components["schemas"]["RegionalSeriesResult"];
export type RegressionDiagnostics = components["schemas"]["RegressionDiagnostics"];
export type ScanRequest = components["schemas"]["ScanRequest"];
export type ScanResult = components["schemas"]["ScanResult"];
export type SeasonalMonth = components["schemas"]["SeasonalMonth"];
export type Seasonality = components["schemas"]["Seasonality"];
export type Series = components["schemas"]["Series"];
export type SeriesRef = components["schemas"]["SeriesRef"];
export type SeriesSource = components["schemas"]["SeriesSource"];
export type SkillMetrics = components["schemas"]["SkillMetrics"];
export type SucceededJob = components["schemas"]["SucceededJob"];
export type TestResult = components["schemas"]["TestResult"];
export type Transform = components["schemas"]["Transform"];
export type UnavailableEstimate = components["schemas"]["UnavailableEstimate"];
export type UnavailableForecast = components["schemas"]["UnavailableForecast"];
export type UnavailableGrade = components["schemas"]["UnavailableGrade"];
export type UnavailableProjection = components["schemas"]["UnavailableProjection"];
export type UnavailableTest = components["schemas"]["UnavailableTest"];
export type ValidationError = components["schemas"]["ValidationError"];
export type VariableCoverage = components["schemas"]["VariableCoverage"];
export type WindowBaseline = components["schemas"]["WindowBaseline"];
