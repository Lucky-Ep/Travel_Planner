import { render, screen } from "@testing-library/react";
import App from "./App";

jest.mock("./features/poi/photoService", () => ({
  getPoiPhoto: () => new Promise(() => {}),
}));

test("renders the POI search page", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /where do you want to go/i }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/search pois/i)).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: /the bund/i }),
  ).toBeInTheDocument();
});
