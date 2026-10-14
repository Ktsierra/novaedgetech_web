import { render } from "@testing-library/react";
import BlackHoleLoader from "../src/components/BlackHoleLoader";
import { describe, it } from 'vitest';
import { LoadingProvider } from "../src/context/LoadingContext";

describe('BlackHoleLoader', () => {
  it('should render a black hole loader', () => {
    render(
      <LoadingProvider>
        <BlackHoleLoader />
      </LoadingProvider>
    );
  });
});