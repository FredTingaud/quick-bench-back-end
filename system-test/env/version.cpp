#include <iostream>

int main() {
#ifdef __clang__
   std::cout << "clang-" << __clang_major__ << "." << __clang_minor__;
#else
   std::cout << "gcc-" << __GNUC__ << "." << __GNUC_MINOR__;
#endif
   return 0;
}
