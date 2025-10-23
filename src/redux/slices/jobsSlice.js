import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobService } from '../../api/services';

/**
 * Initial State
 */
const initialState = {
  jobs: [],
  currentJob: null,
  myJobs: [],
  availableJobs: [],
  jobHistory: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: true,
  },
  filters: {
    status: null,
    category: null,
  },
  stats: null,
};

/**
 * Async Thunks
 */

// Create Job
export const createJob = createAsyncThunk(
  'jobs/createJob',
  async (jobData, { rejectWithValue }) => {
    try {
      const response = await jobService.createJob(jobData);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create job');
    }
  }
);

// Get Jobs
export const getJobs = createAsyncThunk(
  'jobs/getJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobs(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

// Get Single Job
export const getJob = createAsyncThunk(
  'jobs/getJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await jobService.getJob(jobId);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job');
    }
  }
);

// Get My Jobs
export const getMyJobs = createAsyncThunk(
  'jobs/getMyJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await jobService.getMyJobs(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

// Get Available Jobs (Tradesperson)
export const getAvailableJobs = createAsyncThunk(
  'jobs/getAvailableJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await jobService.getAvailableJobs(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch available jobs');
    }
  }
);

// Update Job
export const updateJob = createAsyncThunk(
  'jobs/updateJob',
  async ({ jobId, updates }, { rejectWithValue }) => {
    try {
      const response = await jobService.updateJob(jobId, updates);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update job');
    }
  }
);

// Cancel Job
export const cancelJob = createAsyncThunk(
  'jobs/cancelJob',
  async ({ jobId, reason }, { rejectWithValue }) => {
    try {
      const response = await jobService.cancelJob(jobId, reason);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to cancel job');
    }
  }
);

// Accept Job (Tradesperson)
export const acceptJob = createAsyncThunk(
  'jobs/acceptJob',
  async ({ jobId, data }, { rejectWithValue }) => {
    try {
      const response = await jobService.acceptJob(jobId, data);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept job');
    }
  }
);

// Reject Job (Tradesperson)
export const rejectJob = createAsyncThunk(
  'jobs/rejectJob',
  async ({ jobId, reason }, { rejectWithValue }) => {
    try {
      const response = await jobService.rejectJob(jobId, reason);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to reject job');
    }
  }
);

// Start Job
export const startJob = createAsyncThunk(
  'jobs/startJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await jobService.startJob(jobId);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start job');
    }
  }
);

// Complete Job
export const completeJob = createAsyncThunk(
  'jobs/completeJob',
  async ({ jobId, data }, { rejectWithValue }) => {
    try {
      const response = await jobService.completeJob(jobId, data);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to complete job');
    }
  }
);

// Confirm Completion (Customer)
export const confirmCompletion = createAsyncThunk(
  'jobs/confirmCompletion',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await jobService.confirmCompletion(jobId);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to confirm completion');
    }
  }
);

// Dispute Job
export const disputeJob = createAsyncThunk(
  'jobs/disputeJob',
  async ({ jobId, data }, { rejectWithValue }) => {
    try {
      const response = await jobService.disputeJob(jobId, data);
      return response.job;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to dispute job');
    }
  }
);

// Get Job History
export const getJobHistory = createAsyncThunk(
  'jobs/getJobHistory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobHistory(params);
      return response;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job history');
    }
  }
);

// Get Job Stats
export const getJobStats = createAsyncThunk(
  'jobs/getJobStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobStats();
      return response.stats;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch job stats');
    }
  }
);

/**
 * Jobs Slice
 */
const jobsSlice = createSlice({
  name: 'jobs',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = { status: null, category: null };
    },
    updateLocalJob: (state, action) => {
      const index = state.jobs.findIndex((job) => job.id === action.payload.id);
      if (index !== -1) {
        state.jobs[index] = { ...state.jobs[index], ...action.payload };
      }
      if (state.currentJob?.id === action.payload.id) {
        state.currentJob = { ...state.currentJob, ...action.payload };
      }
    },
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
    resetPagination: (state) => {
      state.pagination = {
        page: 1,
        limit: 20,
        total: 0,
        hasMore: true,
      };
    },
  },
  extraReducers: (builder) => {
    builder
      // Create Job
      .addCase(createJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs.unshift(action.payload);
        state.currentJob = action.payload;
      })
      .addCase(createJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Get Jobs
      .addCase(getJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs;
        state.pagination = action.payload.pagination;
      })
      .addCase(getJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Get Single Job
      .addCase(getJob.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentJob = action.payload;
      })
      .addCase(getJob.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Get My Jobs
      .addCase(getMyJobs.fulfilled, (state, action) => {
        state.myJobs = action.payload.jobs;
      })

      // Get Available Jobs
      .addCase(getAvailableJobs.fulfilled, (state, action) => {
        state.availableJobs = action.payload.jobs;
      })

      // Update Job
      .addCase(updateJob.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })

      // Cancel/Accept/Reject/Start/Complete Job
      .addCase(cancelJob.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(acceptJob.fulfilled, (state, action) => {
        const index = state.availableJobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.availableJobs.splice(index, 1);
        }
        state.myJobs.unshift(action.payload);
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(rejectJob.fulfilled, (state, action) => {
        const index = state.availableJobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.availableJobs.splice(index, 1);
        }
      })
      .addCase(startJob.fulfilled, (state, action) => {
        const index = state.myJobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.myJobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(completeJob.fulfilled, (state, action) => {
        const index = state.myJobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.myJobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })
      .addCase(confirmCompletion.fulfilled, (state, action) => {
        const index = state.jobs.findIndex((job) => job.id === action.payload.id);
        if (index !== -1) {
          state.jobs[index] = action.payload;
        }
        if (state.currentJob?.id === action.payload.id) {
          state.currentJob = action.payload;
        }
      })

      // Job History
      .addCase(getJobHistory.fulfilled, (state, action) => {
        state.jobHistory = action.payload.jobs;
      })

      // Job Stats
      .addCase(getJobStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const {
  clearError,
  setFilters,
  clearFilters,
  updateLocalJob,
  clearCurrentJob,
  resetPagination,
} = jobsSlice.actions;

// Selectors
export const selectJobs = (state) => state.jobs.jobs;
export const selectCurrentJob = (state) => state.jobs.currentJob;
export const selectMyJobs = (state) => state.jobs.myJobs;
export const selectAvailableJobs = (state) => state.jobs.availableJobs;
export const selectJobHistory = (state) => state.jobs.jobHistory;
export const selectJobsLoading = (state) => state.jobs.isLoading;
export const selectJobsError = (state) => state.jobs.error;
export const selectJobsPagination = (state) => state.jobs.pagination;
export const selectJobsFilters = (state) => state.jobs.filters;
export const selectJobStats = (state) => state.jobs.stats;

export default jobsSlice.reducer;
