import { getShowShop } from '@/lib/settings-schema'
import Navbar from './Navbar'

/** Server component — reads shop visibility from DB and passes it to the client Navbar. */
export default async function NavbarWrapper() {
  const showShop = await getShowShop()
  return <Navbar showShop={showShop} />
}
