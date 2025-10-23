import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { locationService } from '../../api/services';

/**
 * Initial State
 */
const initialState = {
  // Current location tracking
  activeJobId: null,
  isTracking: false,
  currentLocation: null,
  lastUpdate: null,

  // Tradesperson location for customer view
  tradesPersonLocation: {},

  // ETA information
  eta: {},

  // Location history
  locationHistory: {},

  // Loading and error states
  isLoading: false,
  error: null,
};

/**
 * Async Thunks
 */

// Update Location (Tradesperson)
export const updateLocation = createAsyncThunk(
  'location/updateLocation',
  async ({ jobId, location }, { rejectWithValue }) => {
    try {
      const response = await locationService.updateLocation(jobId, location);
      return { jobId, location: response.location };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update location');
    }
  }
);

// Get Tradesperson Location (Customer)
export const getTradesPersonLocation = createAsyncThunk(
  'location/getTradesPersonLocation',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.getTradesPersonLocation(jobId);
      return { jobId, location: response.location };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch tradesperson location'
      );
    }
  }
);

// Get ETA
export const getETA = createAsyncThunk(
  'location/getETA',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.getETA(jobId);
      return { jobId, eta: response.eta };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch ETA');
    }
  }
);

// Start Tracking
export const startTracking = createAsyncThunk(
  'location/startTracking',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.startTracking(jobId);
      return { jobId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to start tracking');
    }
  }
);

// Stop Tracking
export const stopTracking = createAsyncThunk(
  'location/stopTracking',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.stopTracking(jobId);
      return { jobId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to stop tracking');
    }
  }
);

// Mark Arrival
export const markArrival = createAsyncThunk(
  'location/markArrival',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.markArrival(jobId);
      return { jobId, ...response };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark arrival');
    }
  }
);

// Get Location History
export const getLocationHistory = createAsyncThunk(
  'location/getLocationHistory',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await locationService.getLocationHistory(jobId);
      return { jobId, history: response.locations };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || 'Failed to fetch location history'
      );
    }
  }
);

/**
 * Location Slice
 */
const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Set current location locally (before API call)
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
      state.lastUpdate = new Date().toISOString();
    },
    // Set active job for tracking
    setActiveJobId: (state, action) => {
      state.activeJobId = action.payload;
    },
    // Clear active job
    clearActiveJobId: (state) => {
      state.activeJobId = null;
      state.isTracking = false;
      state.currentLocation = null;
    },
    // Update tradesperson location from Socket.io
    updateTradesPersonLocationRealtime: (state, action) => {
      const { jobId, location } = action.payload;
      state.tradesPersonLocation[jobId] = location;
    },
    // Update ETA from Socket.io
    updateETARealtime: (state, action) => {
      const { jobId, eta } = action.payload;
      state.eta[jobId] = eta;
    },
    // Clear location data for a job
    clearJobLocation: (state, action) => {
      const jobId = action.payload;
      delete state.tradesPersonLocation[jobId];
      delete state.eta[jobId];
      delete state.locationHistory[jobId];
    },
    // Set tracking state
    setTrackingState: (state, action) => {
      state.isTracking = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Update Location
      .addCase(updateLocation.fulfilled, (state, action) => {
        const { jobId, location } = action.payload;
        state.currentLocation = location;
        state.lastUpdate = new Date().toISOString();

        // Also update tradesperson location for this job (for own view)
        state.tradesPersonLocation[jobId] = location;
      })
      .addCase(updateLocation.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Get Tradesperson Location
      .addCase(getTradesPersonLocation.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getTradesPersonLocation.fulfilled, (state, action) => {
        state.isLoading = false;
        const { jobId, location } = action.payload;
        state.tradesPersonLocation[jobId] = location;
      })
      .addCase(getTradesPersonLocation.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })

      // Get ETA
      .addCase(getETA.fulfilled, (state, action) => {
        const { jobId, eta } = action.payload;
        state.eta[jobId] = eta;
      })

      // Start Tracking
      .addCase(startTracking.fulfilled, (state, action) => {
        const { jobId } = action.payload;
        state.activeJobId = jobId;
        state.isTracking = true;
      })
      .addCase(startTracking.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Stop Tracking
      .addCase(stopTracking.fulfilled, (state, action) => {
        state.isTracking = false;
        state.currentLocation = null;
      })
      .addCase(stopTracking.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Mark Arrival
      .addCase(markArrival.fulfilled, (state, action) => {
        const { jobId } = action.payload;
        state.isTracking = false;
        state.currentLocation = null;

        // Clear ETA since arrived
        delete state.eta[jobId];
      })
      .addCase(markArrival.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Get Location History
      .addCase(getLocationHistory.fulfilled, (state, action) => {
        const { jobId, history } = action.payload;
        state.locationHistory[jobId] = history;
      });
  },
});

export const {
  clearError,
  setCurrentLocation,
  setActiveJobId,
  clearActiveJobId,
  updateTradesPersonLocationRealtime,
  updateETARealtime,
  clearJobLocation,
  setTrackingState,
} = locationSlice.actions;

// Selectors
export const selectActiveJobId = (state) => state.location.activeJobId;
export const selectIsTracking = (state) => state.location.isTracking;
export const selectCurrentLocation = (state) => state.location.currentLocation;
export const selectLastUpdate = (state) => state.location.lastUpdate;
export const selectTradesPersonLocation = (jobId) => (state) =>
  state.location.tradesPersonLocation[jobId];
export const selectETA = (jobId) => (state) => state.location.eta[jobId];
export const selectLocationHistory = (jobId) => (state) =>
  state.location.locationHistory[jobId];
export const selectLocationLoading = (state) => state.location.isLoading;
export const selectLocationError = (state) => state.location.error;

export default locationSlice.reducer;
